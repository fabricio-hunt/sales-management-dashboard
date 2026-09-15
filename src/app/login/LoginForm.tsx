"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MENSAGEM_ERRO_OAUTH: Record<string, string> = {
  "sem-acesso":
    "Essa conta Google não tem acesso liberado. Peça a um administrador para cadastrar seu e-mail em Usuários.",
  oauth: "Não foi possível entrar com o Google. Tente novamente.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.29V6.6H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function LoginForm({ next, erroOAuth }: { next: string; erroOAuth?: string }) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(signIn, { error: null });
  const [entrandoComGoogle, setEntrandoComGoogle] = useState(false);

  const mensagemErroOAuth = erroOAuth ? (MENSAGEM_ERRO_OAUTH[erroOAuth] ?? MENSAGEM_ERRO_OAUTH.oauth) : null;

  async function entrarComGoogle() {
    setEntrandoComGoogle(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // Em caso de sucesso o próprio supabase-js já navega o browser pro Google;
    // só sobra código pra rodar aqui se der erro antes disso acontecer.
    if (error) setEntrandoComGoogle(false);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {state.error && <p className="text-sm text-negative">{state.error}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {mensagemErroOAuth && <p className="text-sm text-negative">{mensagemErroOAuth}</p>}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={entrarComGoogle}
        disabled={entrandoComGoogle}
      >
        <GoogleIcon />
        {entrandoComGoogle ? "Redirecionando..." : "Entrar com Google"}
      </Button>
    </div>
  );
}
