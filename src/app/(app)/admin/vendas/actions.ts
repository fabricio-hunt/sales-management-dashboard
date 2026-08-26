"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requirePermission } from "@/lib/auth/permissions";
import { representantesEscopo } from "@/lib/auth/session";

// Lançamento manual de venda — grava direto em public.vendas (mesma tabela
// fato do import do ERP, origem='manual' pra não ser apagada no próximo
// reimport do DD PEDIDOS, ver supabase_migration_v2_1.sql). Nenhuma tela
// precisa saber a origem da linha: /equipe, rankings, comissão etc. já
// calculam tudo ao vivo a partir de vendas.

type ItemVenda = {
  produto_id: string;
  qtde: number;
  preco_unitario: number;
  desconto: number;
};

function revalidarTelasDependentes() {
  revalidatePath("/equipe");
  revalidatePath("/admin/vendas");
  revalidatePath("/rankings/positivacao");
  revalidatePath("/rankings/financeiro");
  revalidatePath("/rankings/clientes");
  revalidatePath("/rankings/vendedores");
  revalidatePath("/comissoes");
  revalidatePath("/analitico/vendas");
  revalidatePath("/distribuicao");
  revalidatePath("/produtos");
}

export async function lancarVenda(payload: {
  representante_id: string;
  cliente_id: string;
  data_venda: string;
  itens: ItemVenda[];
}) {
  const profile = await requirePermission("admin.vendas", "editar");

  // Escopo: vendedor só lança pra si mesmo (ignora qualquer valor vindo do
  // form); supervisor só pra representante dentro do que foi atribuído a
  // ele; manager sem restrição.
  let representanteId = payload.representante_id;
  if (profile.role === "vendedor") {
    if (!profile.representante_id) throw new Error("Usuário vendedor sem representante vinculado.");
    representanteId = profile.representante_id;
  } else if (profile.role === "supervisor") {
    const escopo = await representantesEscopo(profile);
    const permitido = escopo === "todos" || escopo.includes(payload.representante_id);
    if (!permitido) throw new Error("Você não tem acesso a este representante.");
  }

  if (payload.itens.length === 0) throw new Error("Adicione ao menos um item.");

  const { data: pedidoData, error: pedidoError } = await supabaseAdmin.rpc("gerar_pedido_manual");
  if (pedidoError) throw new Error(pedidoError.message);
  const pedidoNr = pedidoData as string;

  const rows = payload.itens.map((item) => {
    const vendaBruta = item.qtde * item.preco_unitario;
    const vendaLiq = vendaBruta - (item.desconto || 0);
    return {
      pedido_nr: pedidoNr,
      data_venda: payload.data_venda,
      cliente_id: payload.cliente_id,
      representante_id: representanteId,
      produto_id: item.produto_id,
      venda_bruta: vendaBruta,
      desconto: item.desconto || 0,
      venda_liq: vendaLiq,
      devolucao: 0,
      qtde: item.qtde,
      is_positivacao: 1,
      origem: "manual",
    };
  });

  const { error } = await supabaseAdmin.from("vendas").insert(rows);
  if (error) throw new Error(error.message);

  revalidarTelasDependentes();
  return { pedido_nr: pedidoNr };
}

export async function excluirVendaManual(pedidoNr: string) {
  const profile = await requirePermission("admin.vendas", "editar");

  const { data: linhas, error: fetchError } = await supabaseAdmin
    .from("vendas")
    .select("representante_id, origem")
    .eq("pedido_nr", pedidoNr);
  if (fetchError) throw new Error(fetchError.message);
  if (!linhas || linhas.length === 0) throw new Error("Lançamento não encontrado.");
  if (linhas.some((l) => l.origem !== "manual")) {
    throw new Error("Só é possível excluir lançamentos manuais (não vendas importadas do ERP).");
  }

  const representanteId = linhas[0].representante_id;
  if (profile.role === "vendedor" && representanteId !== profile.representante_id) {
    throw new Error("Você só pode excluir os próprios lançamentos.");
  }
  if (profile.role === "supervisor") {
    const escopo = await representantesEscopo(profile);
    const permitido = escopo === "todos" || escopo.includes(representanteId);
    if (!permitido) throw new Error("Você não tem acesso a este representante.");
  }

  const { error } = await supabaseAdmin.from("vendas").delete().eq("pedido_nr", pedidoNr).eq("origem", "manual");
  if (error) throw new Error(error.message);

  revalidarTelasDependentes();
}
