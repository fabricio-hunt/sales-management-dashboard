import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPermissoesResolvidas } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Senha definida pelo manager na criação: nada da app abre antes da troca.
  // /trocar-senha fica fora deste grupo de rotas, então não reentra aqui.
  if (profile.senha_provisoria) redirect("/trocar-senha");

  // manager não passa pela matriz — sempre tem tudo liberado (ver requirePageAccess/requirePermission).
  const permissoes = profile.role === "manager" ? null : await getPermissoesResolvidas(profile);

  return (
    <AppShell profile={profile} permissoes={permissoes}>
      {children}
    </AppShell>
  );
}
