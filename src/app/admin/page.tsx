import { redirect } from "next/navigation";

// /admin era um segundo fluxo de upload (client-side, gravando na tabela
// "pedidos") que ficou órfão de um schema antigo já removido — o import
// oficial é único agora, em /admin/importar (ver /api/admin/import).
export default function AdminIndexPage() {
  redirect("/admin/importar");
}
