"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Toda escrita de tela admin passa por aqui (service role), já que a RLS não
// libera INSERT/UPDATE/DELETE pro role anon (ver supabase_migration_v1.sql).

// ─── Clientes ───

export async function upsertCliente(payload: {
  id: string;
  razao_social: string | null;
  fantasia: string | null;
  cnpj: string | null;
  municipio: string | null;
  uf: string | null;
  representante_id: string | null;
  status: "ativo" | "inativo";
}) {
  const { error } = await supabaseAdmin.from("clientes").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes");
  revalidatePath("/equipe");
}

export async function deleteCliente(id: string) {
  const { error } = await supabaseAdmin.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes");
}

// ─── Representantes ───

export async function upsertRepresentante(payload: { id: string; nome: string; supervisor: string | null }) {
  const { error } = await supabaseAdmin.from("representantes").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/representantes");
  revalidatePath("/equipe");
}

export async function deleteRepresentante(id: string) {
  const { error } = await supabaseAdmin.from("representantes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/representantes");
}

// ─── Fornecedores + aliases ───

export async function upsertFornecedor(payload: { id?: number; nome_fantasia: string; ativo: boolean }) {
  const { error } = await supabaseAdmin.from("fornecedores").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fornecedores");
  revalidatePath("/equipe");
}

export async function upsertFornecedorAlias(payload: { razao_social_erp: string; fornecedor_id: number }) {
  const { error } = await supabaseAdmin
    .from("fornecedor_aliases")
    .upsert({ ...payload, razao_social_erp: payload.razao_social_erp.toUpperCase().trim() }, { onConflict: "razao_social_erp" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fornecedores");
}

export async function deleteFornecedorAlias(razao_social_erp: string) {
  const { error } = await supabaseAdmin.from("fornecedor_aliases").delete().eq("razao_social_erp", razao_social_erp);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fornecedores");
}

// ─── Metas (representante x fornecedor x mês) ───

export async function upsertMeta(payload: {
  mes: string;
  representante_id: string;
  fornecedor_id: number;
  meta_cx: number;
  meta_dia_cx: number;
  meta_fin: number;
  preco_medio: number;
  desafio_dist: number;
  premiacao_pct_cx: number;
  premiacao_pct_fin: number;
}) {
  const { error } = await supabaseAdmin.from("metas").upsert(payload, { onConflict: "mes,representante_id,fornecedor_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
}

export async function deleteMeta(mes: string, representante_id: string, fornecedor_id: number) {
  const { error } = await supabaseAdmin
    .from("metas")
    .delete()
    .eq("mes", mes)
    .eq("representante_id", representante_id)
    .eq("fornecedor_id", fornecedor_id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
}

export async function upsertMetaRepresentante(payload: {
  mes: string;
  representante_id: string;
  obj_positivacao: number;
  cadastro_total_override: number | null;
  base_ativa_override: number | null;
}) {
  const { error } = await supabaseAdmin.from("metas_representante").upsert(payload, { onConflict: "mes,representante_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
}

// ─── Período ───

export async function upsertPeriodo(payload: {
  mes: string;
  data_inicio: string;
  data_fim: string;
  dias_uteis: number;
  regiao: string | null;
  status: "aberto" | "fechado";
}) {
  const { error } = await supabaseAdmin.from("periodos").upsert(payload, { onConflict: "mes" });
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/equipe");
}
