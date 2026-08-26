"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/session";
import type { NivelPermissao } from "@/lib/auth/permissions";

// Gestão da matriz de permissões — restrita ao Manager, mesmo raciocínio de
// admin/usuarios/actions.ts (é o que define o que os outros perfis podem
// fazer, então não pode ser delegado via a própria matriz que ela edita).

export async function upsertPermissaoRole(role: UserRole, modulo_slug: string, nivel: NivelPermissao) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.from("permissoes_role").upsert({ role, modulo_slug, nivel }, { onConflict: "role,modulo_slug" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/permissoes");
}

export async function upsertPermissaoUsuario(user_id: string, modulo_slug: string, nivel: NivelPermissao) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.from("permissoes_usuario").upsert({ user_id, modulo_slug, nivel }, { onConflict: "user_id,modulo_slug" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/permissoes");
}

// Remove o override — volta a herdar o default do perfil (permissoes_role).
export async function removerPermissaoUsuario(user_id: string, modulo_slug: string) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.from("permissoes_usuario").delete().eq("user_id", user_id).eq("modulo_slug", modulo_slug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/permissoes");
}
