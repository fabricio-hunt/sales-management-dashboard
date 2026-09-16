import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { caminhoInternoSeguro } from "@/lib/auth/redirecionamento";

// Nunca deixa uma chamada de rede (Supabase Auth ou o Postgres via
// supabaseAdmin) prender essa function até o timeout da plataforma — 8s aqui
// é bem mais rápido que isso, então se travar a gente falha rápido e visível
// no log em vez de virar um 504 mudo pro usuário.
function comTimeout<T>(promise: Promise<T>, ms: number, rotulo: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout de ${ms}ms em ${rotulo}`)), ms);
    }),
  ]);
}

async function processarCallback(code: string, next: string, url: URL): Promise<NextResponse> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?erro=oauth", url));
  }

  // Login com Google não cria cadastro sozinho — só funciona pra quem já tem
  // uma linha ativa em profiles, criada pelo Manager em /admin/usuarios. O
  // e-mail do Google precisa bater com o e-mail cadastrado lá: é assim que o
  // Supabase liga essa conta OAuth ao mesmo auth.users já existente.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("ativo, senha_provisoria")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.ativo) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?erro=sem-acesso", url));
  }

  // senha_provisoria existe pra obrigar troca de uma senha que quem criou o
  // cadastro conhece (ver actions.ts de admin/usuarios) — não se aplica a
  // quem loga por Google, então não faz sentido travar esse usuário em
  // /trocar-senha esperando uma senha que ele nunca vai precisar definir.
  if (profile.senha_provisoria) {
    await supabaseAdmin.from("profiles").update({ senha_provisoria: false }).eq("id", data.user.id);
  }

  return NextResponse.redirect(new URL(next, url));
}

// Destino do redirectTo do signInWithOAuth (LoginForm). O Supabase manda o
// browser pra cá com ?code= depois do consentimento do Google; aqui a gente
// troca o code pela sessão (grava nos cookies) e decide se essa conta pode
// entrar.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = caminhoInternoSeguro(url.searchParams.get("next"));

  if (code) {
    try {
      return await comTimeout(processarCallback(code, next, url), 8000, "auth/callback");
    } catch (err) {
      console.error("[auth/callback] falhou:", err instanceof Error ? err.message : err);
      return NextResponse.redirect(new URL("/login?erro=oauth", url));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=oauth", url));
}
