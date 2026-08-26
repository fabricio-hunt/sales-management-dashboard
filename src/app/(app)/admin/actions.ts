"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requirePermission } from "@/lib/auth/permissions";

// Toda escrita de tela admin passa por aqui (service role), já que a RLS não
// libera INSERT/UPDATE/DELETE pro role anon (ver supabase_migration_v1.sql).
// Cada função começa checando a matriz de permissões (ver supabase_migration_v2.sql)
// antes de tocar no banco — manager sempre passa, os demais dependem do módulo.

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
  await requirePermission("admin.clientes", "editar");
  const { error } = await supabaseAdmin.from("clientes").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes");
  revalidatePath("/equipe");
}

export async function deleteCliente(id: string) {
  await requirePermission("admin.clientes", "editar");
  const { error } = await supabaseAdmin.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes");
}

// ─── Representantes ───

export async function upsertRepresentante(payload: { id: string; nome: string; supervisor: string | null }) {
  await requirePermission("admin.representantes", "editar");
  const { error } = await supabaseAdmin.from("representantes").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/representantes");
  revalidatePath("/equipe");
}

export async function deleteRepresentante(id: string) {
  await requirePermission("admin.representantes", "editar");
  const { error } = await supabaseAdmin.from("representantes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/representantes");
}

// ─── Fornecedores + aliases ───

export async function upsertFornecedor(payload: { id?: number; nome_fantasia: string; ativo: boolean }) {
  await requirePermission("admin.fornecedores", "editar");
  const { error } = await supabaseAdmin.from("fornecedores").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fornecedores");
  revalidatePath("/equipe");
}

export async function upsertFornecedorAlias(payload: { razao_social_erp: string; fornecedor_id: number }) {
  await requirePermission("admin.fornecedores", "editar");
  const { error } = await supabaseAdmin
    .from("fornecedor_aliases")
    .upsert({ ...payload, razao_social_erp: payload.razao_social_erp.toUpperCase().trim() }, { onConflict: "razao_social_erp" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fornecedores");
}

export async function deleteFornecedorAlias(razao_social_erp: string) {
  await requirePermission("admin.fornecedores", "editar");
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
  await requirePermission("admin.metas", "editar");
  const { error } = await supabaseAdmin.from("metas").upsert(payload, { onConflict: "mes,representante_id,fornecedor_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
}

export async function upsertMetasEmLote(payload: {
  mes: string;
  representante_id: string;
  linhas: Array<{
    fornecedor_id: number;
    meta_cx: number;
    meta_dia_cx: number;
    meta_fin: number;
    preco_medio: number;
    desafio_dist: number;
    premiacao_pct_cx: number;
    premiacao_pct_fin: number;
  }>;
}) {
  await requirePermission("admin.metas", "editar");
  const rows = payload.linhas.map((linha) => ({ mes: payload.mes, representante_id: payload.representante_id, ...linha }));
  const { error } = await supabaseAdmin.from("metas").upsert(rows, { onConflict: "mes,representante_id,fornecedor_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
}

export async function deleteMeta(mes: string, representante_id: string, fornecedor_id: number) {
  await requirePermission("admin.metas", "editar");
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
  positivacao_realizado_override: number | null;
}) {
  await requirePermission("admin.metas", "editar");
  const { error } = await supabaseAdmin.from("metas_representante").upsert(payload, { onConflict: "mes,representante_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/metas");
  revalidatePath("/equipe");
  revalidatePath("/rankings/positivacao");
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
  await requirePermission("configuracoes", "editar");
  const { error } = await supabaseAdmin.from("periodos").upsert(payload, { onConflict: "mes" });
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/equipe");
}
