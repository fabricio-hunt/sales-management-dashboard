import { requirePageAccess } from "@/lib/auth/permissions";
import { representantesEscopo } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import VendasClient from "./VendasClient";

export const revalidate = 0;

export default async function Page() {
  const profile = await requirePageAccess("admin.vendas");
  const supabase = await createServerSupabase();
  const escopo = await representantesEscopo(profile);

  const [{ data: representantesTodos }, { data: clientes }, { data: produtos }, { data: lancamentos }] = await Promise.all([
    supabase.from("representantes").select("id, nome").order("id"),
    // RLS já escopa clientes por representante — vendedor só recebe a própria carteira.
    supabase.from("clientes").select("id, razao_social, fantasia, representante_id").eq("status", "ativo").order("fantasia"),
    supabase.from("produtos").select("id, descricao").order("descricao").limit(3000),
    // RLS já escopa vendas — cada um só vê os próprios lançamentos manuais (ou os do escopo, pro manager/supervisor).
    supabase
      .from("vendas")
      .select("pedido_nr, data_venda, cliente_id, representante_id, produto_id, qtde, venda_liq, created_at")
      .eq("origem", "manual")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const representantes =
    escopo === "todos" ? (representantesTodos ?? []) : (representantesTodos ?? []).filter((r) => escopo.includes(r.id));

  return (
    <VendasClient
      profile={{ id: profile.id, nome: profile.nome, role: profile.role, representante_id: profile.representante_id }}
      representantes={representantes}
      clientes={clientes ?? []}
      produtos={produtos ?? []}
      lancamentosIniciais={lancamentos ?? []}
    />
  );
}
