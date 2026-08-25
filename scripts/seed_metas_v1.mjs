// One-time seed: migra os hardcodes de src/app/equipe/page.tsx (METAS_FORNECEDOR,
// NOME_BANCO_PARA_PLANILHA, PERIODO) + as metas por representante das abas
// individuais da planilha (308/310/312/401/407/408/90) para as tabelas novas
// (fornecedores, fornecedor_aliases, periodos, metas, representantes).
//
// Pré-requisitos:
//   1. Rodar supabase_migration_v1.sql no SQL Editor do Supabase.
//   2. Adicionar SUPABASE_SERVICE_ROLE_KEY em .env.local (Project Settings > API > service_role).
//   3. npm i (garante que @supabase/supabase-js e xlsx estão instalados).
//
// Uso: node scripts/seed_metas_v1.mjs
//
// Idempotente: usa upsert em tudo, pode rodar de novo sem duplicar.

import xlsx from "xlsx";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Faltando NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY em .env.local.\n" +
    "Pegue a service_role key em: Supabase Dashboard > Project Settings > API."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const EXCEL_PATH = "../../NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx";
const REP_SHEETS = ["308", "310", "312", "401", "407", "408", "90"];

// ─── Período (de PERIODO em equipe/page.tsx) ───
const PERIODO = {
  mes: "2026-08-01",
  data_inicio: "2026-08-01",
  data_fim: "2026-08-31",
  dias_uteis: 21,
  regiao: "Jundiaí",
  status: "aberto",
};

// ─── Fornecedores canônicos (nome fantasia usado na planilha/metas) ───
const FORNECEDORES = [
  "Chef Clay", "Chef Clay Granola", "Chef Clay Molhos", "Tapioca Chef Clay",
  "Chef Clay Leite de Coco", "Casaredo", "Coco & Cia", "Riclan", "ZD Alimentos",
  "Portao de Cambui", "Ebicen", "Montevergine", "Neugebauer", "Dgoias",
  "Bretzke", "Bricoflex", "V!be", "Delicia Nordestina", "Toshiba", "Danilla",
  "Dizioli", "Maruchan", "Kobber", "Fampar", "Salcique", "Marata",
];

// ─── Mapeamento razão social do ERP -> nome fantasia (de NOME_BANCO_PARA_PLANILHA) ───
const ALIASES = {
  "ALGO MAIS TEMPEROS EIRELI": "Chef Clay Molhos",
  "ECOVILLE  DO  BRASIL  LIMITADA": "Chef Clay Leite de Coco",
  "ECOVILLE DO BRASIL LIMITADA": "Chef Clay Leite de Coco",
  "MACAU ALIMENTOS LTDA": "Tapioca Chef Clay",
  "GN DISTRIBUIDORA DE ALIMENTOS LTDA": "Chef Clay",
  "NUTRISUL S.A. PRODUTOS ALIMENTICIOS": "Casaredo",
  "DOCE SABOR INDUSTRIA E COMERCIO DE PRODU": "Casaredo",
  "IND. & COM. MENDONCA BARRETO LTDA": "Coco & Cia",
  "RICLAN": "Riclan",
  "RICLAN SA": "Riclan",
  "ZD ALIMENTOS S.A": "ZD Alimentos",
  "ZD ALIMENTOS": "ZD Alimentos",
  "PORTAO DE CAMBUI DOCES E LATICINIOS LTDA": "Portao de Cambui",
  "PORTAO DE CAMBUI": "Portao de Cambui",
  "GLICO ALIMENTOS LT": "Ebicen",
  "EBICEN": "Ebicen",
  "DISTRIBUIDORA DE PRODUTOS ALIMENTICIOS M": "Montevergine",
  "MONTEVERGINE": "Montevergine",
  "NEUGEBAUER ALIMENTOS S/A": "Neugebauer",
  "NEUGEBAUER": "Neugebauer",
  "DGOIAS INDUSTRIA DE ALIMENTOS LTDA": "Dgoias",
  "DGOIAS IND": "Dgoias",
  "DGOIAS": "Dgoias",
  "BRICOFLEX, IMPORTACAO E EXPORTACAO, COME": "Bricoflex",
  "BRICOFLEX": "Bricoflex",
  "BLUE BEVERAGES ENVASADORA LTDA": "V!be",
  "VIBE": "V!be",
  "V!BE": "V!be",
  "DISTRIBUIDORA DENOR LTDA": "Delicia Nordestina",
  "DELICIA NORDESTINA": "Delicia Nordestina",
  "HAYAMAX DISTRIBUIDORA DE PRODUTOS ELETRO": "Toshiba",
  "TOSHIBA": "Toshiba",
  "IND E COM OLIVEIRA LT": "Danilla",
  "DANILLA": "Danilla",
  "BLUE ALIMENTOS EIRELI": "Dizioli",
  "DIZIOLI": "Dizioli",
  "MARUCHAN DO BRASIL, IMPORTACAO, EXPORTAC": "Maruchan",
  "MARUCHAN": "Maruchan",
  "KOBBER ALIMENTOS LT": "Kobber",
  "KOBBER": "Kobber",
  "LINGUA DOCE LTDA": "Fampar",
  "FAMPAR": "Fampar",
  "JOAO SEVERINO CACIQUE": "Salcique",
  "SALCIQUE": "Salcique",
  "SALEIQUE": "Salcique",
  "MARATA SUCOS DO NORDESTE LTDA": "Marata",
  "MARATA": "Marata",
  "MARATA - EXCLUSIVA": "Marata",
  "MARATA VAREJO": "Marata",
  "BRETZKE": "Bretzke",
};

function normNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fuzzyMatchFornecedor(cellValue) {
  if (!cellValue) return null;
  const raw = String(cellValue).trim();
  if (!raw) return null;
  // match exato (case-insensitive), depois prefixo (planilha trunca nomes longos)
  const exact = FORNECEDORES.find((f) => f.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  return FORNECEDORES.find(
    (f) => f.toLowerCase().startsWith(raw.toLowerCase()) || raw.toLowerCase().startsWith(f.toLowerCase())
  ) ?? null;
}

async function main() {
  console.log("Lendo planilha...");
  const buffer = fs.readFileSync(new URL(EXCEL_PATH, import.meta.url));
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: false });

  // ─── 1. Fornecedores ───
  console.log(`Upsert de ${FORNECEDORES.length} fornecedores...`);
  const { data: fornecedoresRows, error: fErr } = await supabase
    .from("fornecedores")
    .upsert(FORNECEDORES.map((nome_fantasia) => ({ nome_fantasia })), { onConflict: "nome_fantasia" })
    .select("id, nome_fantasia");
  if (fErr) throw fErr;
  const fornecedorIdByNome = Object.fromEntries(fornecedoresRows.map((f) => [f.nome_fantasia, f.id]));

  // ─── 2. Aliases ───
  const aliasRows = Object.entries(ALIASES)
    .map(([razao_social_erp, nomeFantasia]) => {
      const fornecedor_id = fornecedorIdByNome[nomeFantasia];
      if (!fornecedor_id) {
        console.warn(`Aviso: alias "${razao_social_erp}" aponta pra fornecedor desconhecido "${nomeFantasia}", pulando.`);
        return null;
      }
      return { razao_social_erp: razao_social_erp.toUpperCase().trim(), fornecedor_id };
    })
    .filter(Boolean);
  console.log(`Upsert de ${aliasRows.length} aliases de fornecedor...`);
  const { error: aErr } = await supabase.from("fornecedor_aliases").upsert(aliasRows, { onConflict: "razao_social_erp" });
  if (aErr) throw aErr;

  // ─── 3. Período ───
  console.log("Upsert do período 2026-08...");
  const { error: pErr } = await supabase.from("periodos").upsert([PERIODO], { onConflict: "mes" });
  if (pErr) throw pErr;

  // ─── 4. Metas por representante x fornecedor (parse das abas individuais) ───
  const premiacaoSuspeita = [];
  let totalMetas = 0;

  for (const repId of REP_SHEETS) {
    const ws = wb.Sheets[repId];
    if (!ws) {
      console.warn(`Aba "${repId}" não encontrada na planilha, pulando.`);
      continue;
    }

    // Nome do representante (coluna B, mesma linha da primeira linha de dados)
    const repNomeCell = ws[xlsx.utils.encode_cell({ r: 12, c: 1 })];
    const repNome = repNomeCell ? String(repNomeCell.v).trim() : `${repId} REPRESENTANTE`;

    await supabase.from("representantes").upsert([{ id: repId, nome: repNome }], { onConflict: "id" });

    // Cabeçalho da aba: Cadastro Total (r3), Base Ativa (r4), Obj. Positivação (r5),
    // Premiação Positivação base (r9,c3), Premiação Financeiro base (r9,c7)
    const cadastroTotal = normNum(ws[xlsx.utils.encode_cell({ r: 3, c: 3 })]?.v) || null;
    const baseAtiva = normNum(ws[xlsx.utils.encode_cell({ r: 4, c: 3 })]?.v) || null;
    const objPositivacao = normNum(ws[xlsx.utils.encode_cell({ r: 5, c: 3 })]?.v);
    const premPositBase = normNum(ws[xlsx.utils.encode_cell({ r: 9, c: 3 })]?.v);
    const premFinBase = normNum(ws[xlsx.utils.encode_cell({ r: 9, c: 7 })]?.v);

    await supabase.from("metas_representante").upsert(
      [{
        mes: PERIODO.mes,
        representante_id: repId,
        obj_positivacao: Math.round(objPositivacao),
        cadastro_total_override: cadastroTotal,
        base_ativa_override: baseAtiva,
        premiacao_pct_positivacao_base: premPositBase,
        premiacao_pct_financeiro_base: premFinBase,
      }],
      { onConflict: "mes,representante_id" }
    );

    const range = xlsx.utils.decode_range(ws["!ref"] || "A1:A1");
    const metasRep = [];

    for (let r = 13; r <= Math.min(range.e.r, 100); r++) {
      const get = (c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;
      const fornecedorNome = fuzzyMatchFornecedor(get(2));
      if (!fornecedorNome) continue; // linha em branco/separador/rodapé

      const fornecedor_id = fornecedorIdByNome[fornecedorNome];
      if (!fornecedor_id) continue;

      const meta_cx = normNum(get(3));
      const meta_dia_cx = normNum(get(6));
      const premiacao_pct_cx = normNum(get(7));
      const meta_fin = normNum(get(8));
      const desafio_dist = Math.round(normNum(get(11)));
      const preco_medio = meta_cx > 0 ? meta_fin / meta_cx : 0;

      if (premiacao_pct_cx > 0.05) {
        premiacaoSuspeita.push(`${repId} / ${fornecedorNome}: premiacao_pct_cx = ${premiacao_pct_cx} (esperado < 5%)`);
      }

      metasRep.push({
        mes: PERIODO.mes,
        representante_id: repId,
        fornecedor_id,
        meta_cx,
        meta_dia_cx,
        meta_fin,
        preco_medio,
        desafio_dist,
        premiacao_pct_cx,
        premiacao_pct_fin: premiacao_pct_cx, // única taxa de premiação presente por linha na planilha; ver ressalva no plano (pendência #2 original)
      });
    }

    if (metasRep.length > 0) {
      const { error: mErr } = await supabase
        .from("metas")
        .upsert(metasRep, { onConflict: "mes,representante_id,fornecedor_id" });
      if (mErr) throw mErr;
      totalMetas += metasRep.length;
      console.log(`  Rep ${repId} (${repNome}): ${metasRep.length} metas de fornecedor importadas.`);
    } else {
      console.warn(`  Rep ${repId}: nenhuma linha de meta reconhecida — confira o layout da aba manualmente.`);
    }
  }

  console.log(`\nConcluído: ${totalMetas} linhas de meta (representante x fornecedor x mês) importadas.`);
  if (premiacaoSuspeita.length > 0) {
    console.warn("\nAVISO — taxas de premiação fora do padrão esperado (<5%), prováveis erros de digitação na planilha original. Revisar com o cliente antes de usar pra cálculo de comissão:");
    premiacaoSuspeita.forEach((m) => console.warn("  - " + m));
  }
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
