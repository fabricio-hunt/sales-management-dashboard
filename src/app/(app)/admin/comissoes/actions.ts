"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requirePermission } from "@/lib/auth/permissions";

export async function upsertComissaoFaixa(payload: {
  id?: number;
  nome: string;
  fornecedor_id: number | null;
  ordem: number;
  pct_atingimento_min: number;
  pct_atingimento_max: number | null;
  modo: "proporcional" | "fator_fixo";
  fator: number;
  ativo: boolean;
}) {
  await requirePermission("admin.comissoes", "editar");
  const { error } = await supabaseAdmin.from("comissao_faixas").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comissoes");
  revalidatePath("/comissoes");
  revalidatePath("/equipe");
}

export async function deleteComissaoFaixa(id: number) {
  await requirePermission("admin.comissoes", "editar");
  const { error } = await supabaseAdmin.from("comissao_faixas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/comissoes");
  revalidatePath("/comissoes");
}
