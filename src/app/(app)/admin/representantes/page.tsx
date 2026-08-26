import { requirePageAccess } from "@/lib/auth/permissions";
import RepresentantesAdminPage from "./RepresentantesClient";

export default async function Page() {
  await requirePageAccess("admin.representantes");
  return <RepresentantesAdminPage />;
}
