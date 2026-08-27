"use client";

import { useActionState } from "react";
import { alterarSenha, type ContaState } from "@/app/(app)/conta/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrocarSenhaForm() {
  const [state, formAction, isPending] = useActionState<ContaState, FormData>(alterarSenha, {
    error: null,
    ok: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      {/* alterarSenha zera senha_provisoria e redireciona pra cá — o layout do
          grupo (app) já libera a navegação porque a flag caiu. */}
      <input type="hidden" name="proximo" value="/" />

      <div className="space-y-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmacao">Confirme a nova senha</Label>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
      </div>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar e entrar"}
      </Button>
    </form>
  );
}
