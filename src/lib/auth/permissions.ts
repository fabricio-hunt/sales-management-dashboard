import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProfile, type Profile, type UserRole } from "@/lib/auth/session";

export type NivelPermissao = "nenhum" | "visualizar" | "editar";

const NIVEL_ORDEM: Record<NivelPermissao, number> = { nenhum: 0, visualizar: 1, editar: 2 };

export type PermissoesResolvidas = Record<string, NivelPermissao>;

// permissoes_usuario (se existir linha pro par usuário+módulo) tem prioridade
// sobre o default de permissoes_role — mesma convenção de override nullable
// já usada em metas_representante (specific overrides general).
export async function getPermissoesResolvidas(profile: Profile): Promise<PermissoesResolvidas> {
  const supabase = await createServerSupabase();
  const [{ data: roleRows }, { data: userRows }] = await Promise.all([
    supabase.from("permissoes_role").select("modulo_slug, nivel").eq("role", profile.role),
    supabase.from("permissoes_usuario").select("modulo_slug, nivel").eq("user_id", profile.id),
  ]);

  const resolved: PermissoesResolvidas = {};
  for (const r of roleRows ?? []) resolved[r.modulo_slug] = r.nivel as NivelPermissao;
  for (const r of userRows ?? []) resolved[r.modulo_slug] = r.nivel as NivelPermissao;
  return resolved;
}

export function nivelAlcanca(nivel: NivelPermissao | undefined, minimo: NivelPermissao): boolean {
  return NIVEL_ORDEM[nivel ?? "nenhum"] >= NIVEL_ORDEM[minimo];
}

// Guarda pra Server Actions (admin/actions.ts e afins) — primeira linha da
// função. Manager sempre passa; os demais dependem da matriz de permissões.
export async function requirePermission(slug: string, minimo: NivelPermissao = "editar"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Não autenticado.");
  if (profile.role === "manager") return profile;

  const resolved = await getPermissoesResolvidas(profile);
  if (!nivelAlcanca(resolved[slug], minimo)) {
    throw new Error(`Sem permissão para "${slug}".`);
  }
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Não autenticado.");
  if (!roles.includes(profile.role)) throw new Error("Sem permissão.");
  return profile;
}

// Guarda pra páginas (RSC) — defesa em profundidade além do Sidebar já vir
// filtrado: uma URL direta não contorna a checagem.
export async function requirePageAccess(slug: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.role !== "manager") {
    const resolved = await getPermissoesResolvidas(profile);
    // Manda o motivo junto: sem isso, quem abre um link compartilhado de uma
    // tela que nao pode ver cai no Resumo Geral sem explicacao nenhuma e conclui
    // que o link esta quebrado.
    if (!nivelAlcanca(resolved[slug], "visualizar")) {
      redirect(`/?sem-acesso=${encodeURIComponent(slug)}`);
    }
  }
  return profile;
}
