import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FORNECEDOR_COLUMNS } from "@/lib/import/expectedColumns";
import { chunk, parseFirstSheetRows, logImport } from "@/lib/import/shared";

// Import independente de fornecedores — aditivo (upsert por nome_fantasia),
// nunca apaga nada. Ao contrário de vendas, não precisa de confirmação prévia:
// pior caso é sobrescrever um nome com valor errado, nunca perder dado.
export const runtime = "nodejs";

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
    const missing = FORNECEDOR_COLUMNS.filter((c) => !foundColumns.has(c));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colunas faltando no arquivo: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const fornecedoresPayload = rows
      .map((r) => {
        const ativoRaw = String(r["Ativo"] ?? "sim").trim().toLowerCase();
        return {
          nome_fantasia: String(r["Nome Fantasia"] ?? "").trim(),
          ativo: ativoRaw !== "não" && ativoRaw !== "nao" && ativoRaw !== "false" && ativoRaw !== "0",
        };
      })
      .filter((f) => f.nome_fantasia);

    if (fornecedoresPayload.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma linha com Nome Fantasia preenchido." }, { status: 400 });
    }

    const nomes = fornecedoresPayload.map((f) => f.nome_fantasia);
    const { data: existentes, error: existErr } = await supabaseAdmin
      .from("fornecedores")
      .select("nome_fantasia")
      .in("nome_fantasia", nomes);
    if (existErr) throw existErr;
    const existentesSet = new Set((existentes ?? []).map((f) => f.nome_fantasia));

    for (const c of chunk(fornecedoresPayload, 500)) {
      const { error } = await supabaseAdmin.from("fornecedores").upsert(c, { onConflict: "nome_fantasia" });
      if (error) throw error;
    }

    const criados = fornecedoresPayload.filter((f) => !existentesSet.has(f.nome_fantasia)).length;
    const atualizados = fornecedoresPayload.length - criados;

    // ─── Aliases ERP (coluna opcional, valores separados por ;) ───
    const { data: fornecedoresAtuais, error: idErr } = await supabaseAdmin
      .from("fornecedores")
      .select("id, nome_fantasia")
      .in("nome_fantasia", nomes);
    if (idErr) throw idErr;
    const idPorNome = new Map((fornecedoresAtuais ?? []).map((f) => [f.nome_fantasia, f.id]));

    const aliasesPayload: { razao_social_erp: string; fornecedor_id: number }[] = [];
    for (const r of rows) {
      const nome = String(r["Nome Fantasia"] ?? "").trim();
      const fornecedorId = idPorNome.get(nome);
      if (!fornecedorId) continue;
      const aliasesRaw = String(r["Aliases ERP (separados por ;)"] ?? "");
      for (const alias of aliasesRaw.split(";")) {
        const norm = alias.toUpperCase().trim();
        if (norm) aliasesPayload.push({ razao_social_erp: norm, fornecedor_id: fornecedorId });
      }
    }
    if (aliasesPayload.length > 0) {
      for (const c of chunk(aliasesPayload, 500)) {
        const { error } = await supabaseAdmin.from("fornecedor_aliases").upsert(c, { onConflict: "razao_social_erp" });
        if (error) throw error;
      }
    }

    await logImport({
      tipo: "fornecedores",
      arquivo_nome: fileName,
      sucesso: true,
      linhas_processadas: fornecedoresPayload.length,
      detalhes: { criados, atualizados, aliases: aliasesPayload.length },
    });

    return NextResponse.json({
      success: true,
      message: `${criados} fornecedor(es) novo(s), ${atualizados} atualizado(s)${aliasesPayload.length > 0 ? `, ${aliasesPayload.length} alias(es) mapeado(s)` : ""}.`,
      stats: { criados, atualizados, aliases: aliasesPayload.length },
    });
  } catch (error) {
    console.error("Import fornecedores error:", error);
    await logImport({
      tipo: "fornecedores",
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
