"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentProfile } from "@/lib/auth/session";

// Ações da própria conta do usuário logado. Não passam por requirePermission:
// não são um módulo da matriz, todo mundo mexe na própria conta e em mais nada.
// O escopo é garantido por sempre usarem o id vindo de getCurrentProfile()
// (auth.uid()) — nunca um id vindo do formulário.

export type ContaState = { error: string | null; ok: string | null };

export async function alterarSenha(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada. Entre novamente.", ok: null };

  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  const proximo = String(formData.get("proximo") ?? "");

  if (senha.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres.", ok: null };
  if (senha !== confirmacao) return { error: "As senhas não conferem.", ok: null };

  // updateUser age sobre a sessão do próprio usuário (cookies), não precisa da
  // service key — é o Auth do Supabase, não a tabela profiles.
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    // Caso comum: "New password should be different from the old password."
    return { error: error.message, ok: null };
  }

  if (profile.senha_provisoria) {
    const { error: flagError } = await supabaseAdmin
      .from("profiles")
      .update({ senha_provisoria: false })
      .eq("id", profile.id);
    // Se a flag não zerar, o usuário volta pra /trocar-senha no próximo request
    // e fica preso — melhor falhar visível do que em silêncio (ver o 42P17 da v2).
    if (flagError) return { error: `Senha alterada, mas falhou ao liberar o acesso: ${flagError.message}`, ok: null };
  }

  revalidatePath("/", "layout");
  if (proximo.startsWith("/")) redirect(proximo);
  return { error: null, ok: "Senha alterada." };
}

export async function alterarNome(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada. Entre novamente.", ok: null };

  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2) return { error: "Informe um nome com pelo menos 2 caracteres.", ok: null };

  // profiles não tem policy de UPDATE pro role authenticated (decisão da v2:
  // toda escrita passa por Server Action), então vai pela service key —
  // travada no próprio id, o formulário não escolhe quem é atualizado.
  const { error } = await supabaseAdmin.from("profiles").update({ nome }).eq("id", profile.id);
  if (error) return { error: error.message, ok: null };

  revalidatePath("/", "layout");
  return { error: null, ok: "Nome atualizado." };
}
