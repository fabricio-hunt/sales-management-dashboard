// One-time backfill: importa o DD PEDIDOS das 5 equipes que nunca passaram
// pelo import mensal (92 Campinas, 93 Sorocaba, 95 EQ. SP, 96 EQ. Sul, 97 EQ.
// Itape) — só a equipe 94 (Jundiaí) já tinha sido importada até 22/09/2026.
// Ver docs/09-representante-vs-equipe.md e docs/PENDENCIAS.md.
//
// Replica FIEL a lógica de src/app/api/admin/import/vendas/route.ts (mesmos
// guardrails de coluna, mesmo parse de header, mesmo delete-and-reinsert por
// período via apagar_vendas_periodo, mesmo upsert de dimensões). Existe como
// script à parte (em vez de chamar a rota HTTP) porque a rota exige sessão
// autenticada de manager (requirePermission), e este backfill roda direto
// com a service role key, sem navegador. Pra importações do dia a dia daqui
// pra frente, o caminho certo continua sendo `/admin/importar` na UI.
//
// Depois de rodar, `equipe_id` de cada representante novo precisa ser
// atribuído (feito automaticamente no fim deste script, a partir do mapa
// abaixo, tirado das abas de cada planilha — ver 09-representante-vs-equipe.md).
//
// Uso:
//   node scripts/import_equipes_restantes.mjs           -> só relatório (dry run), não grava nada
//   node scripts/import_equipes_restantes.mjs --write    -> grava de verdade

import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const WRITE = process.argv.includes("--write");
const CHUNK_SIZE = 500;
const DIR = path.resolve("..", "equipe-de-vendas");

const ARQUIVOS = [
  { equipe: "92", file: "NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 92.xlsx" },
  { equipe: "93", file: "NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 93.xlsx" },
  { equipe: "95", file: "NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 95.xlsx" },
  { equipe: "96", file: "NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 96.xlsx" },
  { equipe: "97", file: "NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 97.xlsx" },
];

// ─── Helpers (copiados de src/lib/import/shared.ts pra não depender de import TS) ───
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};
const toFloat = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const parseRepresentante = (raw) => {
  const str = String(raw ?? "").trim();
  if (!str) return null;
  const match = str.match(/^(\d+)/);
  const id = match ? match[1] : str;
  return { id, nome: str };
};

// Copiado de src/lib/import/expectedColumns.ts (EXPECTED_COLUMNS) — não reimportar
// de dentro de src/ pra não puxar o alias de path "@/..." do Next num script solto.
const EXPECTED_COLUMNS = [
  "Seq", "Data Documento", "Fornecedor", "Cond. Pagto", "Município", "UF",
  "Cliente", "Representante", "Nr Pedido", "Produto", "Região", "Área",
  "Setor", "Entidade", "Transação", "Supervisor", "Linha", "Data", "Ramo",
  "Embalagem", "Kit", "Código Produto", "Fantasia Cliente", "Fantasia Fornec",
  "Cod.Pessoa", "CodReferencia", "DescrReferencia", "CodMotivo", "Descr.Motivo",
  "TipoTabela", "Tipo Doc", "Codigo Kit", "Descrição Kit", "Grupo", "CPF\\CNPJ",
  "Nota Fiscal", "Devolução", "Desconto", "Compra", "Venda", "Qtde Saída",
  "Peso Bruto", "Peso Liq.", "Qtde Dev.", "Desconto Promocional",
  "Qtde Itens Ped", "Desp. Acessória", "VDA LIQ", "TT VDA LIQ", "PEDIDOS",
];

async function logImport(entry) {
  try {
    await supabase.from("import_log").insert({
      tipo: "vendas",
      arquivo_nome: entry.arquivo_nome,
      sucesso: entry.sucesso,
      linhas_processadas: entry.linhas_processadas ?? 0,
      linhas_ignoradas: entry.linhas_ignoradas ?? 0,
      periodo_inicio: entry.periodo_inicio ?? null,
      periodo_fim: entry.periodo_fim ?? null,
      detalhes: entry.detalhes ?? {},
    });
  } catch (err) {
    console.error("Falha ao gravar import_log:", err);
  }
}

async function importarArquivo({ equipe, file }, aliasMap) {
  console.log(`\n=== Equipe ${equipe} (${file}) ===`);
  const buffer = fs.readFileSync(path.join(DIR, file));
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });

  const sheetName = wb.SheetNames.find((s) => s.trim().toUpperCase() === "DD PEDIDOS") ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const range = xlsx.utils.decode_range(ws["!ref"] || "A1:A1");

  let headerRow = range.s.r;
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c: 0 })];
    if (cell && String(cell.v).trim() === "Seq") {
      headerRow = r;
      break;
    }
  }
  ws["!ref"] = xlsx.utils.encode_range({ ...range, s: { ...range.s, r: headerRow } });

  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });
  if (rows.length === 0) {
    console.log("  Nenhum dado encontrado na aba de pedidos — pulando.");
    return null;
  }

  const foundColumns = new Set(Object.keys(rows[0]));
  const missing = EXPECTED_COLUMNS.filter((c) => !foundColumns.has(c));
  if (missing.length > 0) {
    console.log(`  ERRO: colunas faltando: ${missing.join(", ")} — pulando este arquivo.`);
    return null;
  }

  const representantesMap = new Map();
  const clientesMap = new Map();
  const produtosMap = new Map();
  const clienteRepPairs = new Map();
  const razoesNaoMapeadas = new Set();
  const datas = [];
  const repIdsNoArquivo = new Set();

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
    console.log("  ERRO: nenhuma linha com Data Documento válida — pulando.");
    return null;
  }
  const dataMin = datas.reduce((a, b) => (a < b ? a : b));
  const dataMax = datas.reduce((a, b) => (a > b ? a : b));

  console.log(`  Período detectado: ${dataMin} a ${dataMax}`);
  console.log(`  Representantes no arquivo: ${[...repIdsNoArquivo].sort().join(", ")}`);
  console.log(`  Linhas na planilha: ${rows.length} | Clientes distintos: ${clientesMap.size} | Produtos distintos: ${produtosMap.size}`);
  if (razoesNaoMapeadas.size > 0) {
    console.log(`  Fornecedores sem alias (vão virar "[Revisar] ..."): ${[...razoesNaoMapeadas].join("; ")}`);
  }

  if (!WRITE) {
    return { equipe, repIds: [...repIdsNoArquivo], dataMin, dataMax, linhas: rows.length };
  }

  // ─── Auto-cria fornecedores novos ───
  const fornecedoresNovos = [];
  if (razoesNaoMapeadas.size > 0) {
    const novosFornecedores = [...razoesNaoMapeadas].map((razao) => ({ nome_fantasia: `[Revisar] ${razao}` }));
    const { data: inseridos, error: fErr } = await supabase
      .from("fornecedores")
      .upsert(novosFornecedores, { onConflict: "nome_fantasia" })
      .select("id, nome_fantasia");
    if (fErr) throw fErr;

    const novosAliases = [...razoesNaoMapeadas].map((razao) => {
      const fornecedor = inseridos.find((f) => f.nome_fantasia === `[Revisar] ${razao}`);
      return { razao_social_erp: razao, fornecedor_id: fornecedor.id };
    });
    const { error: aErr } = await supabase.from("fornecedor_aliases").upsert(novosAliases, { onConflict: "razao_social_erp" });
    if (aErr) throw aErr;

    novosAliases.forEach((a) => aliasMap.set(a.razao_social_erp, a.fornecedor_id));
    fornecedoresNovos.push(...razoesNaoMapeadas);
  }

  const representantesArr = [...representantesMap.values()];
  for (const c of chunk(representantesArr, CHUNK_SIZE)) {
    const { error } = await supabase.from("representantes").upsert(c, { onConflict: "id" });
    if (error) throw error;
  }
  // Vincula à equipe (novo campo — a rota original de vendas/route.ts não faz
  // isso porque equipe_id não existia quando ela foi escrita).
  const { error: eqErr } = await supabase.from("representantes").update({ equipe_id: equipe }).in("id", representantesArr.map((r) => r.id));
  if (eqErr) throw eqErr;

  const clientesArr = [...clientesMap.values()];
  for (const c of chunk(clientesArr, CHUNK_SIZE)) {
    const { error } = await supabase.from("clientes").upsert(c, { onConflict: "id" });
    if (error) throw error;
  }
  const pares = [...clienteRepPairs.entries()].map(([cliente_id, representante_id]) => ({ cliente_id, representante_id }));
  for (const c of chunk(pares, 1000)) {
    const { error } = await supabase.rpc("atribuir_representante_se_vazio", { p_pares: c });
    if (error) throw error;
  }

  const produtosArr = [...produtosMap.values()].map(({ razaoNorm, ...p }) => ({
    ...p,
    fornecedor_id: aliasMap.get(razaoNorm) ?? null,
  }));
  for (const c of chunk(produtosArr, CHUNK_SIZE)) {
    const { error } = await supabase.from("produtos").upsert(c, { onConflict: "id" });
    if (error) throw error;
  }

  const { error: delErr } = await supabase.rpc("apagar_vendas_periodo", {
    p_data_inicio: dataMin,
    p_data_fim: dataMax,
    p_representante_ids: [...repIdsNoArquivo],
  });
  if (delErr) throw delErr;

  const motivosIgnoradas = new Map();
  const registraIgnorada = (motivo) => motivosIgnoradas.set(motivo, (motivosIgnoradas.get(motivo) ?? 0) + 1);

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
        is_positivacao: String(row["PEDIDOS"]) === "1" ? 1 : 0,
        seq_erp: String(row["Seq"] ?? ""),
        motivo_devolucao: String(row["Descr.Motivo"] ?? "") || null,
      };
    })
    .filter((v) => v !== null);

  const linhasIgnoradas = rows.length - vendasArr.length;

  let inserted = 0;
  try {
    for (const c of chunk(vendasArr, CHUNK_SIZE)) {
      const { error } = await supabase.from("vendas").insert(c);
      if (error) throw error;
      inserted += c.length;
    }
  } catch (insertError) {
    await logImport({
      arquivo_nome: file,
      sucesso: false,
      linhas_processadas: inserted,
      linhas_ignoradas: linhasIgnoradas,
      periodo_inicio: dataMin,
      periodo_fim: dataMax,
      detalhes: { erro: insertError instanceof Error ? insertError.message : String(insertError) },
    });
    throw insertError;
  }

  await logImport({
    arquivo_nome: file,
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
      equipe,
    },
  });

  console.log(`  ✓ Gravado: ${inserted} vendas (${linhasIgnoradas} linhas ignoradas).`);
  return { equipe, repIds: [...repIdsNoArquivo], dataMin, dataMax, inserted, linhasIgnoradas };
}

async function main() {
  console.log(WRITE ? "MODO: GRAVAÇÃO (--write)" : "MODO: SOMENTE RELATÓRIO (dry run — rode com --write pra gravar de verdade)");

  const { data: aliasRows, error: aliasErr } = await supabase.from("fornecedor_aliases").select("razao_social_erp, fornecedor_id");
  if (aliasErr) throw aliasErr;
  const aliasMap = new Map(aliasRows.map((a) => [a.razao_social_erp, a.fornecedor_id]));

  const resultados = [];
  for (const arquivo of ARQUIVOS) {
    const r = await importarArquivo(arquivo, aliasMap);
    if (r) resultados.push(r);
  }

  console.log("\n=== Resumo ===");
  console.table(resultados.map((r) => ({
    equipe: r.equipe,
    periodo: `${r.dataMin} a ${r.dataMax}`,
    representantes: r.repIds.length,
    linhas: r.linhas ?? r.inserted,
  })));

  if (!WRITE) {
    console.log("\nNada foi gravado (dry run). Rode `node scripts/import_equipes_restantes.mjs --write` pra importar de verdade.");
  }
}

main().catch((err) => {
  console.error("\nFALHA:", err);
  process.exit(1);
});
