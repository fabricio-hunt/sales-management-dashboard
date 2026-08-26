import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export type UserRole = "manager" | "supervisor" | "vendedor";

export type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  representante_id: string | null;
  ativo: boolean;
};

// cache() dedupa entre os vários pontos de uma mesma request (layout + página
// + Server Actions chamadas nela) — só bate no banco uma vez por request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, role, representante_id, ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.ativo) return null;
  return profile as Profile;
});

// Representantes que o usuário pode enxergar: "todos" pro manager (sem
// restrição, comportamento atual), lista de ids pra supervisor/vendedor.
export async function representantesEscopo(profile: Profile): Promise<string[] | "todos"> {
  if (profile.role === "manager") return "todos";

  if (profile.role === "vendedor") {
    return profile.representante_id ? [profile.representante_id] : [];
  }

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("supervisor_representantes")
    .select("representante_id")
    .eq("supervisor_id", profile.id);
  return (data ?? []).map((r) => r.representante_id);
}

// Interseção entre o que a tela pediu (?rep=) e o que o usuário pode ver.
// Vendedor/supervisor nunca conseguem escapar do próprio escopo trocando o
// query param na URL.
export function aplicarEscopo(reps: string[], escopo: string[] | "todos"): string[] {
  if (escopo === "todos") return reps;
  const permitido = new Set(escopo);
  return reps.filter((r) => permitido.has(r));
}
