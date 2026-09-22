"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/session";

// Gestão de usuários é restrita ao Manager (não passa pela matriz de módulos
// como o resto do admin — criar/editar login de outra pessoa é sensível o
// bastante pra não delegar via permissoes_usuario).

export type UsuarioComEmail = {
  id: string;
  nome: string;
  role: UserRole;
  representante_id: string | null;
  ativo: boolean;
  senha_provisoria: boolean;
  email: string | null;
};

// O e-mail mora em auth.users, não em profiles — só a Admin API (service role)
// enxerga essa tabela, então a tela não consegue montar essa coluna sozinha
// com o client do browser (RLS + anon key não alcançam auth.users).
export async function listarUsuarios(): Promise<UsuarioComEmail[]> {
  await requireRole(["manager"]);

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, nome, role, representante_id, ativo, senha_provisoria")
    .order("nome");
  if (error) throw new Error(error.message);
  if (!profiles || profiles.length === 0) return [];

  const emailPorId = new Map<string, string>();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (listError) throw new Error(listError.message);
    for (const u of data.users) {
      if (u.email) emailPorId.set(u.id, u.email);
    }
    if (data.users.length < perPage) break;
  }

  return profiles.map((p) => ({ ...p, email: emailPorId.get(p.id) ?? null }));
}

export async function createUsuario(payload: {
  email: string;
  password: string;
  nome: string;
  role: UserRole;
  representante_id: string | null;
}) {
  await requireRole(["manager"]);

  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);
  if (!created.user) throw new Error("Falha ao criar usuário.");

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    nome: payload.nome,
    role: payload.role,
    representante_id: payload.role === "vendedor" ? payload.representante_id : null,
    ativo: true,
    // Quem cria conhece a senha digitada aqui, então ela é só de primeiro
    // acesso: /trocar-senha obriga a troca antes de liberar a app (v2.3).
    senha_provisoria: true,
  });
  if (profileError) {
    // rollback do usuário criado no Auth pra não deixar login órfão sem perfil
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/permissoes");
}

export async function updateUsuario(payload: {
  id: string;
  nome: string;
  role: UserRole;
  representante_id: string | null;
  ativo: boolean;
}) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      nome: payload.nome,
      role: payload.role,
      representante_id: payload.role === "vendedor" ? payload.representante_id : null,
      ativo: payload.ativo,
    })
    .eq("id", payload.id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/permissoes");
}

// Redefinição de senha pelo Manager. Existe porque o projeto não tem SMTP
// configurado: sem e-mail não há "esqueci minha senha", então alguém precisa
// conseguir destravar quem perdeu o acesso — a alternativa seria apagar e
// recriar o usuário, perdendo as atribuições dele.
// Retorna { error } em vez de lançar: em produção o Next.js substitui a
// mensagem de qualquer erro lançado dentro de uma Server Action pelo aviso
// genérico do React (#441), então o motivo real nunca chegaria ao usuário.
export async function resetarSenha(payload: { id: string; password: string }): Promise<{ error?: string }> {
  const manager = await requireRole(["manager"]);

  if (payload.password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(payload.id, {
    password: payload.password,
  });
  if (authError) return { error: authError.message };

  // Volta a exigir troca no próximo acesso: o Manager conhece essa senha, ela
  // não pode virar a senha permanente da pessoa (mesma regra de createUsuario).
  // Exceção: o Manager redefinindo a própria senha já a escolheu, não faz
  // sentido mandá-lo pra /trocar-senha logo em seguida.
  if (payload.id !== manager.id) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ senha_provisoria: true })
      .eq("id", payload.id);
    if (profileError) return { error: profileError.message };
  }

  revalidatePath("/admin/usuarios");
  return {};
}

export async function deleteUsuario(id: string) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}
