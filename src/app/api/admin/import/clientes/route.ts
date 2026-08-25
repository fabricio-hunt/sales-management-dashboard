import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CLIENTE_COLUMNS } from "@/lib/import/expectedColumns";
import { chunk, parseFirstSheetRows, parseRepresentante, logImport } from "@/lib/import/shared";

// Import independente de clientes — aditivo (upsert por Cod.Pessoa). Por
// padrão nunca sobrescreve representante_id/status já atribuídos manualmente
// (mesma regra do import de vendas, via a RPC atribuir_representante_se_vazio).
// "forcarOverwrite" é a saída explícita pra quando o cliente realmente quer
// um resync completo da carteira.
export const runtime = "nodejs";

function normalizaStatus(raw: unknown): "ativo" | "inativo" {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "inativo" ? "inativo" : "ativo";
}

export async function POST(request: NextRequest) {
  let fileName: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as unknown as File | null;
    const forcarOverwrite = formData.get("forcarOverwrite") === "true";
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
    const missing = CLIENTE_COLUMNS.filter((c) => !foundColumns.has(c));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colunas faltando no arquivo: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    let linhasIgnoradas = 0;
    const cadastroPayload: Record<string, unknown>[] = [];
    const clienteRepPairs: { cliente_id: string; representante_id: string }[] = [];
    const overwritePayload: Record<string, unknown>[] = [];

    for (const r of rows) {
      const id = String(r["Cod.Pessoa"] ?? "").trim();
      if (!id) { linhasIgnoradas++; continue; }

      const base = {
        id,
        razao_social: String(r["Razão Social"] ?? "") || null,
        fantasia: String(r["Fantasia"] ?? "") || null,
        cnpj: String(r["CNPJ"] ?? "") || null,
        municipio: String(r["Município"] ?? "") || null,
        uf: String(r["UF"] ?? "") || null,
      };
      cadastroPayload.push(base);

      const rep = parseRepresentante(r["Representante"]);
      if (rep) clienteRepPairs.push({ cliente_id: id, representante_id: rep.id });

      if (forcarOverwrite) {
        overwritePayload.push({
          ...base,
          representante_id: rep?.id ?? null,
          status: normalizaStatus(r["Status"]),
        });
      }
    }

    if (cadastroPayload.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma linha com Cod.Pessoa preenchido." }, { status: 400 });
    }

    const ids = cadastroPayload.map((c) => c.id as string);
    const { data: existentes, error: existErr } = await supabaseAdmin.from("clientes").select("id").in("id", ids);
    if (existErr) throw existErr;
    const existentesSet = new Set((existentes ?? []).map((c) => c.id));
    const criados = ids.filter((id) => !existentesSet.has(id)).length;
    const atualizados = ids.length - criados;

    // Upsert do cadastro básico — nunca inclui representante_id/status aqui,
    // então um upsert normal preserva o que já estava setado manualmente.
    for (const c of chunk(cadastroPayload, 500)) {
      const { error } = await supabaseAdmin.from("clientes").upsert(c, { onConflict: "id" });
      if (error) throw error;
    }

    if (forcarOverwrite) {
      for (const c of chunk(overwritePayload, 500)) {
        const { error } = await supabaseAdmin.from("clientes").upsert(c, { onConflict: "id" });
        if (error) throw error;
      }
    } else {
      // Só atribui representante onde ainda está NULL (clientes novos no arquivo)
      for (const c of chunk(clienteRepPairs, 1000)) {
        const { error } = await supabaseAdmin.rpc("atribuir_representante_se_vazio", { p_pares: c });
        if (error) throw error;
      }
    }

    await logImport({
      tipo: "clientes",
      arquivo_nome: fileName,
      sucesso: true,
      linhas_processadas: cadastroPayload.length,
      linhas_ignoradas: linhasIgnoradas,
      detalhes: { criados, atualizados, forcarOverwrite },
    });

    return NextResponse.json({
      success: true,
      message: `${criados} cliente(s) novo(s), ${atualizados} atualizado(s)${forcarOverwrite ? " (atribuições de representante/status sobrescritas)" : ""}.`,
      stats: { criados, atualizados, linhasIgnoradas },
    });
  } catch (error) {
    console.error("Import clientes error:", error);
    await logImport({
      tipo: "clientes",
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
