import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { TrocarSenhaForm } from "./TrocarSenhaForm";

// Fica FORA do grupo (app) de propósito: é pra cá que o (app)/layout.tsx manda
// quem tem senha_provisoria. Se estivesse dentro do grupo, o layout rodaria de
// novo aqui e redirecionaria pra si mesmo — o mesmo formato de loop infinito
// que a recursão de RLS da v2 causou (ver supabase_migration_v2_2.sql).
export default async function Page() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.senha_provisoria) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <Image src="/logo.jpg" alt="Avante Distribuição" width={48} height={48} className="rounded-full object-cover" />
          <CardTitle>Defina sua senha</CardTitle>
          <CardDescription>
            Olá, {profile.nome}. Sua senha atual foi definida por quem criou seu acesso — escolha uma nova para
            continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrocarSenhaForm />
        </CardContent>
      </Card>
    </div>
  );
}
