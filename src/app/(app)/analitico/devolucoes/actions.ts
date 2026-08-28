"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/auth/permissions";

// Devolução não tem tabela própria — é `devolucao`/`motivo_devolucao` numa
// linha de `vendas`. Linhas origem='erp' são apagadas e recriadas a cada
// reimport do período (ver apagar_vendas_periodo, supabase_migration_v2_1.sql),
// então editar uma devolução vinda do ERP por aqui seria revertido em silêncio
// no mês seguinte. Por isso esta tela só cria/edita/apaga devoluções manuais
// (origem='manual', qtde=0 — mesmo padrão de /admin/vendas, que usa qtde>0
// pra venda). O filtro `qtde=0` nas queries abaixo garante que nunca tocamos
// num lançamento manual de venda por engano.

function revalidarTelasDependentes() {
  revalidatePath("/analitico/devolucoes");
  revalidatePath("/analitico/faturamento-dia");
  revalidatePath("/analitico/cliente");
}

export type DevolucaoPayload = {
  cliente_id: string;
  representante_id: string;
  data_venda: string;
  valor: number;
  motivo: string;
};

function validarPayload(payload: DevolucaoPayload) {
  if (!payload.cliente_id) throw new Error("Selecione o cliente.");
  if (!payload.representante_id) throw new Error("Selecione o representante.");
  if (!payload.data_venda) throw new Error("Informe a data.");
  if (!payload.valor || payload.valor <= 0) throw new Error("Informe um valor de devolução maior que zero.");
  if (!payload.motivo.trim()) throw new Error("Informe o motivo da devolução.");
}

export async function criarDevolucao(payload: DevolucaoPayload) {
  await requireRole(["manager"]);
  validarPayload(payload);

  const { data: pedidoData, error: pedidoError } = await supabaseAdmin.rpc("gerar_pedido_manual");
  if (pedidoError) throw new Error(pedidoError.message);
  const pedidoNr = pedidoData as string;

  const { data, error } = await supabaseAdmin
    .from("vendas")
    .insert({
      pedido_nr: pedidoNr,
      data_venda: payload.data_venda,
      cliente_id: payload.cliente_id,
      representante_id: payload.representante_id,
      venda_bruta: 0,
      desconto: 0,
      venda_liq: 0,
      devolucao: payload.valor,
      motivo_devolucao: payload.motivo.trim(),
      qtde: 0,
      is_positivacao: 0,
      origem: "manual",
    })
    .select("id, pedido_nr, data_venda, cliente_id, representante_id, devolucao, motivo_devolucao, created_at")
    .single();
  if (error) throw new Error(error.message);

  revalidarTelasDependentes();
  return data;
}

export async function atualizarDevolucao(id: string, payload: DevolucaoPayload) {
  await requireRole(["manager"]);
  validarPayload(payload);

  const { data, error } = await supabaseAdmin
    .from("vendas")
    .update({
      cliente_id: payload.cliente_id,
      representante_id: payload.representante_id,
      data_venda: payload.data_venda,
      devolucao: payload.valor,
      motivo_devolucao: payload.motivo.trim(),
    })
    .eq("id", id)
    .eq("origem", "manual")
    .eq("qtde", 0)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Devolução não encontrada ou não é editável (só devoluções lançadas manualmente podem ser editadas aqui).");
  }

  revalidarTelasDependentes();
}

export async function excluirDevolucao(id: string) {
  await requireRole(["manager"]);

  const { data, error } = await supabaseAdmin
    .from("vendas")
    .delete()
    .eq("id", id)
    .eq("origem", "manual")
    .eq("qtde", 0)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Devolução não encontrada ou não é editável (só devoluções lançadas manualmente podem ser excluídas aqui).");
  }

  revalidarTelasDependentes();
}
