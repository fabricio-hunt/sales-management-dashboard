import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { META_COLUMNS } from "@/lib/import/expectedColumns";
import { chunk, toFloat, parseFirstSheetRows, parseRepresentante, logImport } from "@/lib/import/shared";

// Import independente de metas (representante x fornecedor x mês) — aditivo
// (upsert por mes+representante_id+fornecedor_id). Não apaga metas existentes
// do mês que não estejam no arquivo, pra não "zerar" fornecedores esquecidos
// num arquivo parcial. Resolve o nome do fornecedor (nome_fantasia) pro id.
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
    const missing = META_COLUMNS.filter((c) => !foundColumns.has(c));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colunas faltando no arquivo: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: fornecedores, error: fErr } = await supabaseAdmin.from("fornecedores").select("id, nome_fantasia");
    if (fErr) throw fErr;
    const fornecedorIdPorNome = new Map((fornecedores ?? []).map((f) => [f.nome_fantasia.trim().toLowerCase(), f.id]));

    const { data: periodosExistentes, error: pErr } = await supabaseAdmin.from("periodos").select("mes");
    if (pErr) throw pErr;
    const mesesValidos = new Set((periodosExistentes ?? []).map((p) => p.mes));

    const motivosIgnoradas = new Map<string, number>();
    const registraIgnorada = (motivo: string) => motivosIgnoradas.set(motivo, (motivosIgnoradas.get(motivo) ?? 0) + 1);

    const metasPayload: Record<string, unknown>[] = [];
    for (const r of rows) {
      const mes = parseMes(r["Mês"]);
      if (!mes) { registraIgnorada("mês inválido"); continue; }
      if (!mesesValidos.has(mes)) { registraIgnorada(`período ${mes} não existe (crie em /configuracoes primeiro)`); continue; }

      const rep = parseRepresentante(r["Representante"]);
      if (!rep) { registraIgnorada("sem representante"); continue; }

      const nomeFornecedor = String(r["Fornecedor"] ?? "").trim().toLowerCase();
      const fornecedorId = fornecedorIdPorNome.get(nomeFornecedor);
      if (!fornecedorId) { registraIgnorada(`fornecedor "${r["Fornecedor"]}" não cadastrado`); continue; }

      metasPayload.push({
        mes,
        representante_id: rep.id,
        fornecedor_id: fornecedorId,
        meta_cx: toFloat(r["Meta Cx"]),
        meta_dia_cx: toFloat(r["Meta Dia Cx"]),
        meta_fin: toFloat(r["Meta Fin"]),
        preco_medio: toFloat(r["Preço Médio"]),
        desafio_dist: toFloat(r["Desafio Dist"]),
        premiacao_pct_cx: toFloat(r["Premiação % Cx"]),
        premiacao_pct_fin: toFloat(r["Premiação % Fin"]),
      });
    }

    if (metasPayload.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Nenhuma linha válida pra importar. Motivos: ${[...motivosIgnoradas.entries()].map(([m, n]) => `${m} (${n})`).join(", ")}`,
      }, { status: 400 });
    }

    // Conta criados/atualizados: busca metas existentes só dos meses/reps presentes no arquivo
    const mesesNoArquivo = [...new Set(metasPayload.map((m) => m.mes as string))];
    const repsNoArquivo = [...new Set(metasPayload.map((m) => m.representante_id as string))];
    const { data: existentes, error: existErr } = await supabaseAdmin
      .from("metas")
      .select("mes, representante_id, fornecedor_id")
      .in("mes", mesesNoArquivo)
      .in("representante_id", repsNoArquivo);
    if (existErr) throw existErr;
    const existentesSet = new Set((existentes ?? []).map((m) => `${m.mes}|${m.representante_id}|${m.fornecedor_id}`));
    const criados = metasPayload.filter((m) => !existentesSet.has(`${m.mes}|${m.representante_id}|${m.fornecedor_id}`)).length;
    const atualizados = metasPayload.length - criados;

    for (const c of chunk(metasPayload, 500)) {
      const { error } = await supabaseAdmin.from("metas").upsert(c, { onConflict: "mes,representante_id,fornecedor_id" });
      if (error) throw error;
    }

    const linhasIgnoradas = rows.length - metasPayload.length;

    await logImport({
      tipo: "metas",
      arquivo_nome: fileName,
      sucesso: true,
      linhas_processadas: metasPayload.length,
      linhas_ignoradas: linhasIgnoradas,
      detalhes: { criados, atualizados, motivosIgnoradas: Object.fromEntries(motivosIgnoradas) },
    });

    return NextResponse.json({
      success: true,
      message: `${criados} meta(s) nova(s), ${atualizados} atualizada(s)${linhasIgnoradas > 0 ? `, ${linhasIgnoradas} linha(s) ignorada(s)` : ""}.`,
      stats: { criados, atualizados, linhasIgnoradas, motivosIgnoradas: Object.fromEntries(motivosIgnoradas) },
    });
  } catch (error) {
    console.error("Import metas error:", error);
    await logImport({
      tipo: "metas",
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
