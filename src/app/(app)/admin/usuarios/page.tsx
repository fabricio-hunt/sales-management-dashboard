import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import UsuariosAdminPage from "./UsuariosClient";

// Gestão de usuários fica restrita ao Manager, sem exceção via matriz de
// permissões (é a tela que concede permissão — não delega a si mesma).
export default async function Page() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "manager") redirect("/");
  return <UsuariosAdminPage />;
}
