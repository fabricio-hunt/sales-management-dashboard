import { requirePageAccess } from "@/lib/auth/permissions";
import ConfiguracoesPage from "./ConfiguracoesClient";

export default async function Page() {
  await requirePageAccess("configuracoes");
  return <ConfiguracoesPage />;
}
