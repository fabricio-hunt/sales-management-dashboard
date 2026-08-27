import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import ContaClient from "./ContaClient";

// Sem requirePageAccess: "Minha conta" não é módulo da matriz de permissões —
// qualquer usuário logado mexe na própria conta, independente do papel.
export default async function Page() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ContaClient nome={profile.nome} email={user?.email ?? ""} role={profile.role} />;
}
