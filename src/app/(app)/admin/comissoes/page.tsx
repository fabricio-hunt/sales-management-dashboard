import { requirePageAccess } from "@/lib/auth/permissions";
import ComissoesAdminPage from "./ComissoesClient";

export default async function Page() {
  await requirePageAccess("admin.comissoes");
  return <ComissoesAdminPage />;
}
