import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export type UserRole = "manager" | "supervisor" | "vendedor";

export type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  representante_id: string | null;
  ativo: boolean;
  senha_provisoria: boolean;
};

// cache() dedupa entre os vários pontos de uma mesma request (layout + página
// + Server Actions chamadas nela) — só bate no banco uma vez por request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nome, role, representante_id, ativo, senha_provisoria")
    .eq("id", user.id)
    .maybeSingle();

  // Sem isso o erro some: quem chama trata null como "não logado" e manda pro
  // /login, o middleware vê a sessão válida e devolve pra "/" — loop de
  // redirect sem nenhuma pista no log. Foi assim que a recursão de RLS da v2
  // passou despercebida (ver supabase_migration_v2_2.sql).
  if (error) {
    console.error("[auth] falha ao ler profiles:", error.code, error.message);
    return null;
  }

  if (!profile || !profile.ativo) return null;
  return profile as Profile;
});

// Representantes que o usuário pode enxergar: "todos" pro manager (sem
// restrição, comportamento atual), lista de ids pra supervisor/vendedor.
//
// Supervisor (v2.7, 22/09/2026): o escopo agora vem principalmente da equipe
// (representantes.equipe_id -> equipes.supervisor_id = ele), espelhando
// pode_ver_representante() no banco. supervisor_representantes (vínculo
// manual antigo) continua somado por segurança — sem tirar acesso que já
// existisse — mas deixou de ser o caminho principal; ver
// docs/plano-implementacao-equipes.md.
export async function representantesEscopo(profile: Profile): Promise<string[] | "todos"> {
  if (profile.role === "manager") return "todos";

  if (profile.role === "vendedor") {
    return profile.representante_id ? [profile.representante_id] : [];
  }

  const supabase = await createServerSupabase();
  const [{ data: daEquipe }, { data: manual }] = await Promise.all([
    supabase.from("representantes").select("id, equipes!inner(supervisor_id)").eq("equipes.supervisor_id", profile.id),
    supabase.from("supervisor_representantes").select("representante_id").eq("supervisor_id", profile.id),
  ]);
  const ids = new Set<string>();
  for (const r of daEquipe ?? []) ids.add(r.id);
  for (const r of manual ?? []) ids.add(r.representante_id);
  return [...ids];
}

// Interseção entre o que a tela pediu (?rep=) e o que o usuário pode ver.
// Vendedor/supervisor nunca conseguem escapar do próprio escopo trocando o
// query param na URL.
export function aplicarEscopo(reps: string[], escopo: string[] | "todos"): string[] {
  if (escopo === "todos") return reps;
  const permitido = new Set(escopo);
  return reps.filter((r) => permitido.has(r));
}
