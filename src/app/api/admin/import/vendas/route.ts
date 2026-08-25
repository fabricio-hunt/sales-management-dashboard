import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { EXPECTED_COLUMNS } from "@/lib/import/expectedColumns";
import { chunk, toFloat, parseRepresentante, logImport } from "@/lib/import/shared";

// Import do DD PEDIDOS (vendas) — roda 100% em Node/TS, service role key,
// guardrails de coluna, upsert de dimensões e delete-and-reinsert idempotente
// por período. É o único dos 4 imports que não tem chave natural confiável
// em vendas, por isso é o único que precisa de confirmação explícita antes
// de substituir dados existentes do período.
export const runtime = "nodejs";
export const maxDuration = 120;

const CHUNK_SIZE = 500;

export async function POST(request: NextRequest) {
  let fileName: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as unknown as File | null;
    const confirm = formData.get("confirm") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    fileName = file.name;

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });

    const sheetName =
      wb.SheetNames.find((s) => s.trim().toUpperCase() === "DD PEDIDOS") ?? wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const range = xlsx.utils.decode_range(ws["!ref"] || "A1:A1");

    // Acha a linha de cabeçalho real (a planilha pode ter linhas em branco/título antes)
    let headerRow = range.s.r;
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c: 0 })];
      if (cell && String(cell.v).trim() === "Seq") {
        headerRow = r;
        break;
      }
    }
    ws["!ref"] = xlsx.utils.encode_range({ ...range, s: { ...range.s, r: headerRow } });

    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum dado encontrado na aba de pedidos." }, { status: 400 });
    }

    // Guardrails: valida colunas esperadas
    const foundColumns = new Set(Object.keys(rows[0]));
    const missing = EXPECTED_COLUMNS.filter((c) => !foundColumns.has(c));
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Colunas faltando no arquivo: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ─── Carrega aliases de fornecedor existentes ───
    const { data: aliasRows, error: aliasErr } = await supabaseAdmin
      .from("fornecedor_aliases")
      .select("razao_social_erp, fornecedor_id");
    if (aliasErr) throw aliasErr;
    const aliasMap = new Map<string, number>(aliasRows.map((a) => [a.razao_social_erp, a.fornecedor_id]));

    // ─── 1ª passada: monta dimensões e detecta fornecedores não mapeados ───
    const representantesMap = new Map<string, { id: string; nome: string; supervisor: string }>();
    const clientesMap = new Map<string, Record<string, unknown>>();
    const produtosMap = new Map<string, { id: string; descricao: string; fornecedor_nome: string; razaoNorm: string }>();
    const clienteRepPairs = new Map<string, string>(); // cliente_id -> representante_id
    const razoesNaoMapeadas = new Set<string>();
    const datas: string[] = [];
    const repIdsNoArquivo = new Set<string>();

    for (const row of rows) {
      const rep = parseRepresentante(row["Representante"]);
      if (rep) {
        representantesMap.set(rep.id, { id: rep.id, nome: rep.nome, supervisor: String(row["Supervisor"] ?? "") });
        repIdsNoArquivo.add(rep.id);
      }

      const cliId = String(row["Cod.Pessoa"] ?? "").trim();
      if (cliId) {
        clientesMap.set(cliId, {
          id: cliId,
          razao_social: String(row["Cliente"] ?? ""),
          fantasia: String(row["Fantasia Cliente"] ?? ""),
          cnpj: String(row["CPF\\CNPJ"] ?? ""),
          municipio: String(row["Município"] ?? ""),
          uf: String(row["UF"] ?? ""),
        });
        if (rep) clienteRepPairs.set(cliId, rep.id);
      }

      const razaoNorm = String(row["Fornecedor"] ?? "").toUpperCase().trim();
      if (razaoNorm && !aliasMap.has(razaoNorm)) razoesNaoMapeadas.add(razaoNorm);

      const prodId = String(row["Código Produto"] ?? "").trim();
      if (prodId) {
        produtosMap.set(prodId, {
          id: prodId,
          descricao: String(row["Produto"] ?? ""),
          fornecedor_nome: String(row["Fornecedor"] ?? ""),
          razaoNorm,
        });
      }

      const dataDoc = row["Data Documento"];
      if (dataDoc instanceof Date && !isNaN(dataDoc.getTime())) {
        datas.push(dataDoc.toISOString().split("T")[0]);
      }
    }

    if (datas.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhuma linha com Data Documento válida." }, { status: 400 });
    }
    const dataMin = datas.reduce((a, b) => (a < b ? a : b));
    const dataMax = datas.reduce((a, b) => (a > b ? a : b));

    // Confirmação explícita antes de substituir dados existentes do período
    if (!confirm) {
      return NextResponse.json({
        success: false,
        needsConfirmation: true,
        message: `Isso vai substituir todas as vendas de ${dataMin} a ${dataMax} para ${repIdsNoArquivo.size} representante(s) (${[...repIdsNoArquivo].join(", ")}). Reenvie com confirm=true pra prosseguir.`,
        periodo: { data_inicio: dataMin, data_fim: dataMax, representantes: [...repIdsNoArquivo] },
      }, { status: 409 });
    }

    // ─── Auto-cria fornecedores novos (nome fantasia provisório = razão social) ───
    const fornecedoresNovos: string[] = [];
    if (razoesNaoMapeadas.size > 0) {
      const novosFornecedores = [...razoesNaoMapeadas].map((razao) => ({
        nome_fantasia: `[Revisar] ${razao}`,
      }));
      const { data: inseridos, error: fErr } = await supabaseAdmin
        .from("fornecedores")
        .upsert(novosFornecedores, { onConflict: "nome_fantasia" })
        .select("id, nome_fantasia");
      if (fErr) throw fErr;

      const novosAliases = [...razoesNaoMapeadas].map((razao) => {
        const fornecedor = inseridos.find((f) => f.nome_fantasia === `[Revisar] ${razao}`);
        return { razao_social_erp: razao, fornecedor_id: fornecedor!.id };
      });
      const { error: aErr } = await supabaseAdmin
        .from("fornecedor_aliases")
        .upsert(novosAliases, { onConflict: "razao_social_erp" });
      if (aErr) throw aErr;

      novosAliases.forEach((a) => aliasMap.set(a.razao_social_erp, a.fornecedor_id));
      fornecedoresNovos.push(...razoesNaoMapeadas);
    }

    // ─── Upsert de dimensões (ordem importa: fornecedores já resolvidos acima) ───
    const representantesArr = [...representantesMap.values()];
    for (const c of chunk(representantesArr, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from("representantes").upsert(c, { onConflict: "id" });
      if (error) throw error;
    }

    // Clientes: nunca sobrescreve representante_id/status já setados (upsert só cadastro)
    const clientesArr = [...clientesMap.values()];
    for (const c of chunk(clientesArr, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from("clientes").upsert(c, { onConflict: "id" });
      if (error) throw error;
    }
    const pares = [...clienteRepPairs.entries()].map(([cliente_id, representante_id]) => ({ cliente_id, representante_id }));
    for (const c of chunk(pares, 1000)) {
      const { error } = await supabaseAdmin.rpc("atribuir_representante_se_vazio", { p_pares: c });
      if (error) throw error;
    }

    const produtosArr = [...produtosMap.values()].map(({ razaoNorm, ...p }) => ({
      ...p,
      fornecedor_id: aliasMap.get(razaoNorm) ?? null,
    }));
    for (const c of chunk(produtosArr, CHUNK_SIZE)) {
      const { error } = await supabaseAdmin.from("produtos").upsert(c, { onConflict: "id" });
      if (error) throw error;
    }

    // ─── Delete-and-reinsert do período (idempotência) ───
    const { error: delErr } = await supabaseAdmin.rpc("apagar_vendas_periodo", {
      p_data_inicio: dataMin,
      p_data_fim: dataMax,
      p_representante_ids: [...repIdsNoArquivo],
    });
    if (delErr) throw delErr;

    const motivosIgnoradas = new Map<string, number>();
    const registraIgnorada = (motivo: string) => motivosIgnoradas.set(motivo, (motivosIgnoradas.get(motivo) ?? 0) + 1);

    const vendasArr = rows
      .map((row) => {
        const rep = parseRepresentante(row["Representante"]);
        const cliId = String(row["Cod.Pessoa"] ?? "").trim();
        const prodId = String(row["Código Produto"] ?? "").trim();
        const dataDoc = row["Data Documento"];
        if (!rep) { registraIgnorada("sem representante"); return null; }
        if (!cliId) { registraIgnorada("sem cliente (Cod.Pessoa)"); return null; }
        if (!prodId) { registraIgnorada("sem produto (Código Produto)"); return null; }
        if (!(dataDoc instanceof Date) || isNaN(dataDoc.getTime())) { registraIgnorada("data inválida"); return null; }

        return {
          pedido_nr: String(row["Nr Pedido"] ?? ""),
          data_venda: dataDoc.toISOString().split("T")[0],
          cliente_id: cliId,
          representante_id: rep.id,
          produto_id: prodId,
          venda_liq: toFloat(row["VDA LIQ"]),
          devolucao: toFloat(row["Devolução"]),
          desconto: toFloat(row["Desconto"]),
          venda_bruta: toFloat(row["Venda"]),
          qtde: toFloat(row["Qtde Saída"]),
          peso_bruto: toFloat(row["Peso Bruto"]),
          peso_liq: toFloat(row["Peso Liq."]),
          // A coluna se chama "PEDIDOS" neste export do ERP (não "POSIT", apesar do nome
          // sugerir outra coisa) — é a flag 0/1 de positivação, valores confirmados no arquivo real.
          is_positivacao: String(row["PEDIDOS"]) === "1" ? 1 : 0,
          seq_erp: String(row["Seq"] ?? ""),
          motivo_devolucao: String(row["Descr.Motivo"] ?? "") || null,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const linhasIgnoradas = rows.length - vendasArr.length;

    let inserted = 0;
    try {
      for (const c of chunk(vendasArr, CHUNK_SIZE)) {
        const { error } = await supabaseAdmin.from("vendas").insert(c);
        if (error) throw error;
        inserted += c.length;
      }
    } catch (insertError) {
      await logImport({
        tipo: "vendas",
        arquivo_nome: fileName,
        sucesso: false,
        linhas_processadas: inserted,
        linhas_ignoradas: linhasIgnoradas,
        periodo_inicio: dataMin,
        periodo_fim: dataMax,
        detalhes: { erro: insertError instanceof Error ? insertError.message : String(insertError) },
      });
      const msg = insertError instanceof Error ? insertError.message : "Erro desconhecido";
      return NextResponse.json({
        success: false,
        error: `Falha ao inserir vendas (${inserted} de ${vendasArr.length} linhas gravadas): ${msg}. O período ${dataMin} a ${dataMax} pode ter ficado incompleto — reenvie o mesmo arquivo pra corrigir (a importação é segura para repetir, ela apaga e recria o período inteiro).`,
      }, { status: 500 });
    }

    await logImport({
      tipo: "vendas",
      arquivo_nome: fileName,
      sucesso: true,
      linhas_processadas: inserted,
      linhas_ignoradas: linhasIgnoradas,
      periodo_inicio: dataMin,
      periodo_fim: dataMax,
      detalhes: {
        representantes: representantesArr.length,
        clientes: clientesArr.length,
        produtos: produtosArr.length,
        fornecedoresNovosParaRevisar: fornecedoresNovos,
        motivosIgnoradas: Object.fromEntries(motivosIgnoradas),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${inserted} vendas (${dataMin} a ${dataMax}).`,
      stats: {
        vendasInseridas: inserted,
        linhasIgnoradas,
        representantes: representantesArr.length,
        clientes: clientesArr.length,
        produtos: produtosArr.length,
        fornecedoresNovosParaRevisar: fornecedoresNovos,
        periodo: { data_inicio: dataMin, data_fim: dataMax },
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    await logImport({
      tipo: "vendas",
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
