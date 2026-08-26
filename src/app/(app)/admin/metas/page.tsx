import { requirePageAccess } from "@/lib/auth/permissions";
import MetasAdminPage from "./MetasClient";

export default async function Page() {
  await requirePageAccess("admin.metas");
  return <MetasAdminPage />;
}
