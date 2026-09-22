import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import EquipesAdminPage from "./EquipesClient";

// Gestão de equipes fica restrita ao Manager, sem exceção via matriz de
// permissões — mesmo motivo de admin/usuarios: atribuir supervisor a uma
// equipe determina o que aquela pessoa enxerga no sistema inteiro.
export default async function Page() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "manager") redirect("/");
  return <EquipesAdminPage />;
}
