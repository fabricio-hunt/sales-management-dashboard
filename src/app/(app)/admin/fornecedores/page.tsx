import { requirePageAccess } from "@/lib/auth/permissions";
import FornecedoresAdminPage from "./FornecedoresClient";

export default async function Page() {
  await requirePageAccess("admin.fornecedores");
  return <FornecedoresAdminPage />;
}
