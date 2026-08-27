"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/session";

// Gestão de usuários é restrita ao Manager (não passa pela matriz de módulos
// como o resto do admin — criar/editar login de outra pessoa é sensível o
// bastante pra não delegar via permissoes_usuario).

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
export async function resetarSenha(payload: { id: string; password: string }) {
  const manager = await requireRole(["manager"]);

  if (payload.password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(payload.id, {
    password: payload.password,
  });
  if (authError) throw new Error(authError.message);

  // Volta a exigir troca no próximo acesso: o Manager conhece essa senha, ela
  // não pode virar a senha permanente da pessoa (mesma regra de createUsuario).
  // Exceção: o Manager redefinindo a própria senha já a escolheu, não faz
  // sentido mandá-lo pra /trocar-senha logo em seguida.
  if (payload.id !== manager.id) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ senha_provisoria: true })
      .eq("id", payload.id);
    if (profileError) throw new Error(profileError.message);
  }

  revalidatePath("/admin/usuarios");
}

export async function deleteUsuario(id: string) {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

export async function setSupervisorRepresentantes(supervisorId: string, representanteIds: string[]) {
  await requireRole(["manager"]);
  const { error: delError } = await supabaseAdmin.from("supervisor_representantes").delete().eq("supervisor_id", supervisorId);
  if (delError) throw new Error(delError.message);

  if (representanteIds.length > 0) {
    const { error: insError } = await supabaseAdmin
      .from("supervisor_representantes")
      .insert(representanteIds.map((representante_id) => ({ supervisor_id: supervisorId, representante_id })));
    if (insError) throw new Error(insError.message);
  }
  revalidatePath("/admin/usuarios");
}
