import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { caminhoInternoSeguro } from "@/lib/auth/redirecionamento";

// Destino do redirectTo do signInWithOAuth (LoginForm). O Supabase manda o
// browser pra cá com ?code= depois do consentimento do Google; aqui a gente
// troca o code pela sessão (grava nos cookies) e decide se essa conta pode
// entrar.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = caminhoInternoSeguro(url.searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Login com Google não cria cadastro sozinho — só funciona pra quem já
      // tem uma linha ativa em profiles, criada pelo Manager em /admin/usuarios.
      // O e-mail do Google precisa bater com o e-mail cadastrado lá: é assim
      // que o Supabase liga essa conta OAuth ao mesmo auth.users já existente.
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ativo, senha_provisoria")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.ativo) {
        // senha_provisoria existe pra obrigar troca de uma senha que quem
        // criou o cadastro conhece (ver actions.ts de admin/usuarios) — não
        // se aplica a quem loga por Google, então não faz sentido travar
        // esse usuário em /trocar-senha esperando uma senha que ele nunca
        // vai precisar definir.
        if (profile.senha_provisoria) {
          await supabaseAdmin.from("profiles").update({ senha_provisoria: false }).eq("id", data.user.id);
        }
        return NextResponse.redirect(new URL(next, url));
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=sem-acesso", url));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=oauth", url));
}
