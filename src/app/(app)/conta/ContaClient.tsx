"use client";

import { useActionState, useEffect } from "react";
import { alterarNome, alterarSenha, type ContaState } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  manager: "Gerente",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

const vazio: ContaState = { error: null, ok: null };

export default function ContaClient({ nome, email, role }: { nome: string; email: string; role: string }) {
  const [nomeState, nomeAction, nomePending] = useActionState(alterarNome, vazio);
  const [senhaState, senhaAction, senhaPending] = useActionState(alterarSenha, vazio);

  useEffect(() => {
    if (nomeState.ok) toast.success(nomeState.ok);
  }, [nomeState]);

  useEffect(() => {
    if (senhaState.ok) toast.success(senhaState.ok);
  }, [senhaState]);

  return (
    <div className="mx-auto flex max-w-[700px] flex-col gap-6 p-6">
      <PageHeader ajuda="conta" title="Minha conta" subtitle="Altere seu nome de exibição e sua senha de acesso." />

      <Card>
        <CardHeader>
          <CardTitle>Dados de acesso</CardTitle>
          <CardDescription>
            O e-mail de login e o perfil de acesso só podem ser alterados pelo gerente, em Usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">E-mail</p>
              <p className="font-medium">{email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Perfil</p>
              <p className="font-medium">{ROLE_LABEL[role] ?? role}</p>
            </div>
          </div>

          <form action={nomeAction} className="flex items-end gap-3 border-t border-border pt-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="nome">Nome de exibição</Label>
              <Input id="nome" name="nome" defaultValue={nome} required />
            </div>
            <Button type="submit" disabled={nomePending}>
              {nomePending ? "Salvando..." : "Salvar nome"}
            </Button>
          </form>
          {nomeState.error && <p className="text-sm text-negative">{nomeState.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>Mínimo de 6 caracteres. Você continua logado após a troca.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={senhaAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" name="senha" type="password" autoComplete="new-password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao">Confirme a nova senha</Label>
              <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
            </div>
            {senhaState.error && <p className="text-sm text-negative">{senhaState.error}</p>}
            <Button type="submit" disabled={senhaPending}>
              {senhaPending ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
