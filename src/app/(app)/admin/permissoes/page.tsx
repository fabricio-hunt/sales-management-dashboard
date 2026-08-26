import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import PermissoesAdminPage from "./PermissoesClient";

// Mesma restrição de admin/usuarios: só Manager, sem delegar via a própria
// matriz que esta tela edita.
export default async function Page() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "manager") redirect("/");
  return <PermissoesAdminPage />;
}
