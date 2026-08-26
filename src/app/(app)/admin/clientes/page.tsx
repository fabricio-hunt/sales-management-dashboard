import { requirePageAccess } from "@/lib/auth/permissions";
import ClientesAdminPage from "./ClientesClient";

export default async function Page() {
  await requirePageAccess("admin.clientes");
  return <ClientesAdminPage />;
}
