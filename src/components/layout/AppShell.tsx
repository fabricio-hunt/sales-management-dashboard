import { Sidebar } from "@/components/layout/Sidebar";
import type { Profile } from "@/lib/auth/session";
import type { PermissoesResolvidas } from "@/lib/auth/permissions";

export function AppShell({
  children,
  profile,
  permissoes,
}: {
  children: React.ReactNode;
  profile: Profile;
  permissoes: PermissoesResolvidas | null;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground md:flex-row">
      <Sidebar profile={profile} permissoes={permissoes} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
