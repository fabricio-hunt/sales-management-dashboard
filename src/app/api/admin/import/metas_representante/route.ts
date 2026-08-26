import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { META_REPRESENTANTE_COLUMNS } from "@/lib/import/expectedColumns";
import { chunk, toFloat, toIntOrNull, parseFirstSheetRows, parseRepresentante, logImport } from "@/lib/import/shared";
import { requirePermission } from "@/lib/auth/permissions";

// Import independente de objetivos por representante (mês) — aditivo (upsert
// por mes+representante_id), mesmo padrão do import de metas. Existe pra
// atender o pedido do cliente de manter "clientes positivados" (e os demais
// overrides) atualizados via planilha em vez de edição manual em /admin/metas.
export const runtime = "nodejs";

function parseMes(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const str = String(raw ?? "").trim();
  const iso = str.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-01`;
  const brMes = str.match(/^(\d{1,2})\/(\d{4})$/); // MM/AAAA
  if (brMes) return `${brMes[2]}-${brMes[1].padStart(2, "0")}-01`;
  return null;
}

export async function POST(request: NextRequest) {
  let fileName: string | null = null;
  try {
    await requirePermission("admin.importar", "editar");
    const formData = await request.formData();
    const file = formData.get("file") as unknown as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    fileName = file.name;

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseFirstSheetRows(buffer);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum dado encontrado na planilha." }, { status: 400 });
    }

    const foundColumns = new Set(Object.keys(rows[0]));
    const missing = META_REPRESENTANTE_COLUMNS.filter((c) => !foundColumns.has(c));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colunas faltando no arquivo: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: periodosExistentes, error: pErr } = await supabaseAdmin.from("periodos").select("mes");
    if (pErr) throw pErr;
    const mesesValidos = new Set((periodosExistentes ?? []).map((p) => p.mes));

    const motivosIgnoradas = new Map<string, number>();
    const registraIgnorada = (motivo: string) => motivosIgnoradas.set(motivo, (motivosIgnoradas.get(motivo) ?? 0) + 1);

    const payload: Record<string, unknown>[] = [];
    for (const r of rows) {
      const mes = parseMes(r["Mês"]);
      if (!mes) { registraIgnorada("mês inválido"); continue; }
      if (!mesesValidos.has(mes)) { registraIgnorada(`período ${mes} não existe (crie em /configuracoes primeiro)`); continue; }

      const rep = parseRepresentante(r["Representante"]);
      if (!rep) { registraIgnorada("sem representante"); continue; }

      payload.push({
        mes,
        representante_id: rep.id,
        obj_positivacao: toFloat(r["Obj. Positivação"]),
        cadastro_total_override: toIntOrNull(r["Cadastro Total Override"]),
        base_ativa_override: toIntOrNull(r["Base Ativa Override"]),
        positivacao_realizado_override: toIntOrNull(r["Positivação Realizado Override"]),
      });
    }

    if (payload.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Nenhuma linha válida pra importar. Motivos: ${[...motivosIgnoradas.entries()].map(([m, n]) => `${m} (${n})`).join(", ")}`,
      }, { status: 400 });
    }

    const mesesNoArquivo = [...new Set(payload.map((m) => m.mes as string))];
    const repsNoArquivo = [...new Set(payload.map((m) => m.representante_id as string))];
    const { data: existentes, error: existErr } = await supabaseAdmin
      .from("metas_representante")
      .select("mes, representante_id")
      .in("mes", mesesNoArquivo)
      .in("representante_id", repsNoArquivo);
    if (existErr) throw existErr;
    const existentesSet = new Set((existentes ?? []).map((m) => `${m.mes}|${m.representante_id}`));
    const criados = payload.filter((m) => !existentesSet.has(`${m.mes}|${m.representante_id}`)).length;
    const atualizados = payload.length - criados;

    for (const c of chunk(payload, 500)) {
      const { error } = await supabaseAdmin.from("metas_representante").upsert(c, { onConflict: "mes,representante_id" });
      if (error) throw error;
    }

    const linhasIgnoradas = rows.length - payload.length;

    await logImport({
      tipo: "metas_representante",
      arquivo_nome: fileName,
      sucesso: true,
      linhas_processadas: payload.length,
      linhas_ignoradas: linhasIgnoradas,
      detalhes: { criados, atualizados, motivosIgnoradas: Object.fromEntries(motivosIgnoradas) },
    });

    return NextResponse.json({
      success: true,
      message: `${criados} objetivo(s) novo(s), ${atualizados} atualizado(s)${linhasIgnoradas > 0 ? `, ${linhasIgnoradas} linha(s) ignorada(s)` : ""}.`,
      stats: { criados, atualizados, linhasIgnoradas, motivosIgnoradas: Object.fromEntries(motivosIgnoradas) },
    });
  } catch (error) {
    console.error("Import metas_representante error:", error);
    await logImport({
      tipo: "metas_representante",
      arquivo_nome: fileName,
      sucesso: false,
      detalhes: { erro: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Falha no servidor ao processar o import." },
      { status: 500 }
    );
  }
}
