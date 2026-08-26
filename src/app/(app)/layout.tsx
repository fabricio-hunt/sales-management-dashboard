import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPermissoesResolvidas } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // manager não passa pela matriz — sempre tem tudo liberado (ver requirePageAccess/requirePermission).
  const permissoes = profile.role === "manager" ? null : await getPermissoesResolvidas(profile);

  return (
    <AppShell profile={profile} permissoes={permissoes}>
      {children}
    </AppShell>
  );
}
