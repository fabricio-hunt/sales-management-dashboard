import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

// ─── CONFIGURAÇÃO DO PERÍODO (atualizar mensalmente) ───
const PERIODO = {
  inicio: "2026-08-01",
  fim: "2026-08-31",
  label: "01/08/2026 a 31/08/2026",
  diasUteis: 21,
  regiao: "Jundiaí",
};

// ─── DADOS EXTRAÍDOS DIRETAMENTE DA PLANILHA "Equipe" ───
// Chave: nome do fornecedor exato como aparece na planilha / banco
const METAS_FORNECEDOR: Record<
  string,
  { metaCx: number; metaDiaCx: number; metaFin: number; desafioDist: number }
> = {
  "Chef Clay":              { metaCx: 365,  metaDiaCx: 16.78,  metaFin: 26490.95,  desafioDist: 192 },
  "Chef Clay Granola":      { metaCx: 5,    metaDiaCx: 0.625,  metaFin: 433.89,    desafioDist: 56  },
  "Chef Clay Molhos":       { metaCx: 220,  metaDiaCx: 14.5,   metaFin: 14227.19,  desafioDist: 118 },
  "Tapioca Chef Clay":      { metaCx: 60,   metaDiaCx: 5.875,  metaFin: 5901.09,   desafioDist: 40  },
  "Chef Clay Leite de Coco":{ metaCx: 155,  metaDiaCx: 13.81,  metaFin: 8466.66,   desafioDist: 92  },
  "Casaredo":               { metaCx: 245,  metaDiaCx: 6.625,  metaFin: 18763.16,  desafioDist: 144 },
  "Coco & Cia":             { metaCx: 355,  metaDiaCx: 31.84,  metaFin: 44628.84,  desafioDist: 108 },
  "Riclan":                 { metaCx: 1340, metaDiaCx: 28.65,  metaFin: 98502.68,  desafioDist: 370 },
  "ZD Alimentos":           { metaCx: 315,  metaDiaCx: 15.62,  metaFin: 37165.97,  desafioDist: 266 },
  "Portao de Cambui":       { metaCx: 135,  metaDiaCx: 7.08,   metaFin: 74924.82,  desafioDist: 310 },
  "Ebicen":                 { metaCx: 180,  metaDiaCx: 5.84,   metaFin: 21262.77,  desafioDist: 150 },
  "Montevergine":           { metaCx: 325,  metaDiaCx: 14.93,  metaFin: 25701.53,  desafioDist: 228 },
  "Neugebauer":             { metaCx: 335,  metaDiaCx: 13.26,  metaFin: 86975.94,  desafioDist: 212 },
  "Dgoias":                 { metaCx: 100,  metaDiaCx: 8.125,  metaFin: 19203.78,  desafioDist: 72  },
  "Bretzke":                { metaCx: 0,    metaDiaCx: 0,      metaFin: 0,         desafioDist: 112 },
  "Bricoflex":              { metaCx: 0,    metaDiaCx: 0,      metaFin: 0,         desafioDist: 84  },
  "V!be":                   { metaCx: 145,  metaDiaCx: 0,      metaFin: 11395.28,  desafioDist: 36  },
  "Delicia Nordestina":     { metaCx: 310,  metaDiaCx: 28.25,  metaFin: 25977.58,  desafioDist: 42  },
  "Toshiba":                { metaCx: 20,   metaDiaCx: 1.95,   metaFin: 13853.98,  desafioDist: 76  },
  "Danilla":                { metaCx: 53,   metaDiaCx: 2.19,   metaFin: 24375.27,  desafioDist: 184 },
  "Dizioli":                { metaCx: 365,  metaDiaCx: 15.72,  metaFin: 53741.23,  desafioDist: 266 },
  "Maruchan":               { metaCx: 250,  metaDiaCx: 12.25,  metaFin: 12863.65,  desafioDist: 64  },
  "Kobber":                 { metaCx: 75,   metaDiaCx: 6.60,   metaFin: 12214.90,  desafioDist: 102 },
  "Fampar":                 { metaCx: 22,   metaDiaCx: 1.89,   metaFin: 11999.89,  desafioDist: 108 },
  "Salcique":               { metaCx: 185,  metaDiaCx: 11.5,   metaFin: 10121.16,  desafioDist: 38  },
  "Marata":                 { metaCx: 1500, metaDiaCx: 63.17,  metaFin: 78747.85,  desafioDist: 256 },
};

// Mapeamento COMPLETO: razão social do banco → nome fantasia da planilha
// Baseado na inspeção dos produtos por fornecedor na planilha DD PEDIDOS
const NOME_BANCO_PARA_PLANILHA: Record<string, string> = {
  // Chef Clay - fabricante é ALGO MAIS TEMPEROS EIRELI (molhos, temperos, sal de parrilla)
  "ALGO MAIS TEMPEROS EIRELI":            "Chef Clay Molhos",
  // Chef Clay Leite de Coco - ECOVILLE DO BRASIL (geleia chef clay, leite de coco)
  "ECOVILLE  DO  BRASIL  LIMITADA":       "Chef Clay Leite de Coco",
  "ECOVILLE DO BRASIL LIMITADA":          "Chef Clay Leite de Coco",
  // Chef Clay Granola - não identificado, mas Tapioca é MACAU ALIMENTOS
  "MACAU ALIMENTOS LTDA":                 "Tapioca Chef Clay",
  // Chef Clay - GN DISTRIBUIDORA (ketchup, molho barbecue chef clay)
  "GN DISTRIBUIDORA DE ALIMENTOS LTDA":  "Chef Clay",
  // Casaredo / Danilla - NUTRISUL (biscoito casaredo, wafer my bit)
  "NUTRISUL S.A. PRODUTOS ALIMENTICIOS": "Casaredo",
  // Casaredo - DOCE SABOR (dadinho, paçoca)
  "DOCE SABOR INDUSTRIA E COMERCIO DE PRODU": "Casaredo",
  // Coco & Cia - IND. MENDONCA BARRETO (coco flocado, ralado)
  "IND. & COM. MENDONCA BARRETO LTDA":   "Coco & Cia",
  // Riclan
  "RICLAN":                              "Riclan",
  "RICLAN SA":                           "Riclan",
  // ZD Alimentos
  "ZD ALIMENTOS S.A":                    "ZD Alimentos",
  "ZD ALIMENTOS":                        "ZD Alimentos",
  // Portão de Cambuí
  "PORTAO DE CAMBUI DOCES E LATICINIOS LTDA": "Portao de Cambui",
  "PORTAO DE CAMBUI":                    "Portao de Cambui",
  // Ebicen - GLICO ALIMENTOS (snacks Glico, Ebicen)
  "GLICO ALIMENTOS LT":                  "Ebicen",
  "EBICEN":                              "Ebicen",
  // Montevergine - DISTRIBUIDORA DE PRODUTOS ALIMENTICIOS M (torrone)
  "DISTRIBUIDORA DE PRODUTOS ALIMENTICIOS M": "Montevergine",
  "MONTEVERGINE":                        "Montevergine",
  // Neugebauer
  "NEUGEBAUER ALIMENTOS S/A":            "Neugebauer",
  "NEUGEBAUER":                          "Neugebauer",
  // Dgoias
  "DGOIAS INDUSTRIA DE ALIMENTOS LTDA":  "Dgoias",
  "DGOIAS IND":                          "Dgoias",
  "DGOIAS":                              "Dgoias",
  // Bricoflex
  "BRICOFLEX, IMPORTACAO E EXPORTACAO, COME": "Bricoflex",
  "BRICOFLEX":                           "Bricoflex",
  // V!be - BLUE BEVERAGES (energético, refrigerante)
  "BLUE BEVERAGES ENVASADORA LTDA":      "V!be",
  "VIBE":                                "V!be",
  "V!BE":                                "V!be",
  // Delicia Nordestina - DISTRIBUIDORA DENOR LTDA (bolacha)
  "DISTRIBUIDORA DENOR LTDA":            "Delicia Nordestina",
  "DELICIA NORDESTINA":                  "Delicia Nordestina",
  // Toshiba - HAYAMAX (pilhas Toshiba)
  "HAYAMAX DISTRIBUIDORA DE PRODUTOS ELETRO": "Toshiba",
  "TOSHIBA":                             "Toshiba",
  // Danilla - IND E COM OLIVEIRA (doce de leite Oliveira)
  "IND E COM OLIVEIRA LT":               "Danilla",
  "DANILLA":                             "Danilla",
  // Dizioli - BLUE ALIMENTOS EIRELI (chocolate em pó, granulado)
  "BLUE ALIMENTOS EIRELI":               "Dizioli",
  "DIZIOLI":                             "Dizioli",
  // Maruchan
  "MARUCHAN DO BRASIL, IMPORTACAO, EXPORTAC": "Maruchan",
  "MARUCHAN":                            "Maruchan",
  // Kobber
  "KOBBER ALIMENTOS LT":                 "Kobber",
  "KOBBER":                              "Kobber",
  // Fampar - LINGUA DOCE LTDA (doces aurora, paçoca)
  "LINGUA DOCE LTDA":                    "Fampar",
  "FAMPAR":                              "Fampar",
  // Salcique - JOAO SEVERINO CACIQUE (salgadinhos salcique)
  "JOAO SEVERINO CACIQUE":               "Salcique",
  "SALCIQUE":                            "Salcique",
  "SALEIQUE":                            "Salcique",
  // Marata
  "MARATA SUCOS DO NORDESTE LTDA":       "Marata",
  "MARATA":                              "Marata",
  "MARATA - EXCLUSIVA":                  "Marata",
  "MARATA VAREJO":                       "Marata",
  // Bretzke (não identificado nos produtos, manter como está)
  "BRETZKE":                             "Bretzke",
  // Audaz Foods / Good Days Brasil - sem meta definida, agrupa como Outros
  "AUDAZ FOODS LTDA":                    "Outros",
  "GOOD  DAYS  BRASIL  LTDA":            "Outros",
  "GOOD DAYS BRASIL LTDA":               "Outros",
};

// Valores reais da planilha (header)
const CADASTRO_TOTAL = 1288;
const BASE_ATIVA = 1214;
const OBJ_POSITIVACAO = 605;
const META_FINANCEIRA_TOTAL = 737940.06;

async function fetchAllVendas() {
  let allVendas: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("vendas")
      .select("venda_liq, qtde, cliente_id, is_positivacao, data_venda, produtos(fornecedor_nome)")
      .gte("data_venda", PERIODO.inicio)
      .lte("data_venda", PERIODO.fim)
      .range(from, from + pageSize - 1);

    if (error) { console.error("Error:", error); break; }
    if (data && data.length > 0) allVendas = allVendas.concat(data);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return allVendas;
}

function normalizeFornecedor(nome: string): string {
  const upper = nome.toUpperCase().trim();
  // Exact match first
  if (NOME_BANCO_PARA_PLANILHA[upper]) return NOME_BANCO_PARA_PLANILHA[upper];
  // Partial match
  for (const [key, val] of Object.entries(NOME_BANCO_PARA_PLANILHA)) {
    if (upper.startsWith(key) || key.startsWith(upper)) return val;
  }
  // Return the original with proper casing if not found
  return nome;
}

export default async function EquipePage() {
  const vendas = await fetchAllVendas();

  const diasComVendasSet = new Set<string>();
  const clientesPositivadosSet = new Set<string>();
  let receitaTotal = 0;

  const fornecedoresMap: Record<string, {
    realCx: number;
    realFin: number;
    clientes: Set<string>;
    vendaLiqTotal: number;
    qtdeTotal: number;
  }> = {};

  vendas.forEach((v) => {
    if (v.data_venda) diasComVendasSet.add(v.data_venda);

    const vendaLiq = Number(v.venda_liq) || 0;
    const qtde = Number(v.qtde) || 0;

    const rawNome = Array.isArray(v.produtos)
      ? v.produtos[0]?.fornecedor_nome
      : v.produtos?.fornecedor_nome;
    const fornecedorKey = rawNome ? normalizeFornecedor(rawNome) : "Outros";

    // Só consideramos faturamento e positivação para fornecedores mapeados na meta
    if (METAS_FORNECEDOR[fornecedorKey]) {
      receitaTotal += vendaLiq;
      if (v.is_positivacao === 1 && v.cliente_id) {
        clientesPositivadosSet.add(v.cliente_id);
      }
    }

    if (!fornecedoresMap[fornecedorKey]) {
      fornecedoresMap[fornecedorKey] = { realCx: 0, realFin: 0, clientes: new Set(), vendaLiqTotal: 0, qtdeTotal: 0 };
    }
    fornecedoresMap[fornecedorKey].realCx += qtde;
    fornecedoresMap[fornecedorKey].realFin += vendaLiq;
    fornecedoresMap[fornecedorKey].vendaLiqTotal += vendaLiq;
    fornecedoresMap[fornecedorKey].qtdeTotal += qtde;
    if (v.cliente_id) fornecedoresMap[fornecedorKey].clientes.add(v.cliente_id);
  });

  // Merge any remaining "Outros" que não foram mapeados com fornecedores conhecidos de metas
  const diasFaturado = diasComVendasSet.size;
  const diasRestam = Math.max(0, PERIODO.diasUteis - diasFaturado);
  const pctIdeal = PERIODO.diasUteis > 0 ? (diasFaturado / PERIODO.diasUteis) * 100 : 0;

  const positivadosCount = clientesPositivadosSet.size;
  const faltaPositivar = Math.max(0, OBJ_POSITIVACAO - positivadosCount);
  const pctPositivacaoRealizado = OBJ_POSITIVACAO > 0 ? (positivadosCount / OBJ_POSITIVACAO) * 100 : 0;
  const pctFinanceiroRealizado = META_FINANCEIRA_TOTAL > 0 ? (receitaTotal / META_FINANCEIRA_TOTAL) * 100 : 0;
  const projecaoFechamento = diasFaturado > 0 ? (receitaTotal / diasFaturado) * PERIODO.diasUteis : 0;
  const pctProjecao = META_FINANCEIRA_TOTAL > 0 ? (projecaoFechamento / META_FINANCEIRA_TOTAL) * 100 : 0;
  const faltaFinanceiro = Math.max(0, META_FINANCEIRA_TOTAL - receitaTotal);
  const necessidadeVendaDia = diasRestam > 0 ? faltaFinanceiro / diasRestam : 0;

  // Montar tabela: exibir APENAS fornecedores definidos na planilha Excel (metas)
  const allFornecedorNames = new Set(Object.keys(METAS_FORNECEDOR));

  const tableData = Array.from(allFornecedorNames).map((nome) => {
    const dados = fornecedoresMap[nome] || { realCx: 0, realFin: 0, clientes: new Set(), vendaLiqTotal: 0, qtdeTotal: 0 };
    const meta = METAS_FORNECEDOR[nome] || { metaCx: 0, metaDiaCx: 0, metaFin: 0, desafioDist: 0 };
    const realDist = dados.clientes.size;
    const faltaDist = Math.max(0, meta.desafioDist - realDist);
    const precoMedio = dados.qtdeTotal > 0 ? dados.vendaLiqTotal / dados.qtdeTotal : 0;
    const pctCx = meta.metaCx > 0 ? (dados.realCx / meta.metaCx) * 100 : 0;
    const pctFin = meta.metaFin > 0 ? (dados.realFin / meta.metaFin) * 100 : 0;

    return {
      nome,
      metaCx: meta.metaCx,
      realCx: dados.realCx,
      pctCx,
      metaDiaCx: meta.metaDiaCx,
      metaFin: meta.metaFin,
      realFin: dados.realFin,
      pctFin,
      desafioDist: meta.desafioDist,
      realDist,
      faltaDist,
      precoMedio,
    };
  });

  // Mantém a ordem exata da planilha (definida em METAS_FORNECEDOR)

  // Totais
  const totalMetaFin = tableData.reduce((s, r) => s + r.metaFin, 0);
  const totalRealFin = tableData.reduce((s, r) => s + r.realFin, 0);
  const totalMetaCx = tableData.reduce((s, r) => s + r.metaCx, 0);
  const totalRealCx = tableData.reduce((s, r) => s + r.realCx, 0);
  const totalPctFin = totalMetaFin > 0 ? (totalRealFin / totalMetaFin) * 100 : 0;
  const totalPctCx = totalMetaCx > 0 ? (totalRealCx / totalMetaCx) * 100 : 0;

  // Formatters
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;
  const fmtCur = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtNum2 = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const fmtNum0 = (v: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ─── HEADER ─── */}
      <div className="bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch">
          <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-slate-700">
            <div className="text-2xl font-black text-white tracking-tight">{PERIODO.regiao}</div>
            <div className="text-slate-400 text-sm mt-1">Período: {PERIODO.label}</div>
          </div>
          <div className="flex divide-x divide-slate-700 flex-wrap">
            {[
              { label: "Dias Úteis",    value: PERIODO.diasUteis, color: "text-white" },
              { label: "Dias Faturado", value: diasFaturado,      color: "text-blue-400" },
              { label: "Dias Restam",   value: diasRestam,        color: "text-amber-400" },
              { label: "% Ideal",       value: fmtPct(pctIdeal),  color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-6 py-5 text-center min-w-[110px]">
                <p className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SCORECARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bloco: Positivação */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-slate-800 px-4 py-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">Positivação de Clientes</p>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Cadastro Total",   value: fmtNum0(CADASTRO_TOTAL),         color: "text-slate-900",  bg: "" },
                  { label: "Base Ativa",        value: fmtNum0(BASE_ATIVA),             color: "text-slate-900",  bg: "" },
                  { label: "Obj. Positivação",  value: fmtNum0(OBJ_POSITIVACAO),        color: "text-amber-600",  bg: "bg-amber-50" },
                  { label: "Realizado Mês",     value: fmtNum0(positivadosCount),       color: "text-slate-900",  bg: "" },
                  { label: "Falta Positivar",   value: fmtNum0(faltaPositivar),         color: "text-rose-600 font-bold", bg: "bg-yellow-50" },
                  { label: "% Realizado",       value: fmtPct(pctPositivacaoRealizado), color: pctPositivacaoRealizado >= pctIdeal ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                ].map(({ label, value, color, bg }) => (
                  <tr key={label} className={`border-b hover:bg-slate-50 ${bg}`}>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">{label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${color}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Bloco: Financeiro */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-slate-800 px-4 py-2">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">Resultado Financeiro</p>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Obj. Financeiro",     value: fmtCur(META_FINANCEIRA_TOTAL),  color: "text-amber-600",  bg: "bg-amber-50" },
                  { label: "Vda Real. Mês",        value: fmtCur(receitaTotal),           color: "text-slate-900",  bg: "" },
                  { label: "% Realizado",          value: fmtPct(pctFinanceiroRealizado), color: pctFinanceiroRealizado >= pctIdeal ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                  { label: "Projeção Fech.",       value: fmtCur(projecaoFechamento),     color: "text-slate-900",  bg: "" },
                  { label: "% Projeção Fech.",     value: fmtPct(pctProjecao),            color: pctProjecao >= 100 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                  { label: "Necessidade Venda/dia",value: fmtCur(necessidadeVendaDia),    color: "text-amber-700 font-bold", bg: "bg-yellow-50" },
                ].map(({ label, value, color, bg }) => (
                  <tr key={label} className={`border-b hover:bg-slate-50 ${bg}`}>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">{label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${color}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ─── TABELA DE FORNECEDORES ─── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">
            Objetivo em Caixas · Meta Financeira · Desafio Distribuição
          </h2>
          <span className="text-slate-400 text-xs bg-slate-700 px-3 py-1 rounded-full">
            {tableData.filter(r => r.realFin > 0 || r.metaFin > 0).length} fornecedores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 border-b border-r bg-slate-100 font-bold text-slate-700 text-center" rowSpan={2}>CM</th>
                <th className="px-3 py-2 border-b border-r bg-slate-100 font-bold text-slate-700" rowSpan={2}>Fornecedor</th>

                {/* Objetivo em Caixas */}
                <th colSpan={4} className="px-3 py-1.5 border-b border-r text-center font-bold bg-yellow-100 text-yellow-900 border-t">
                  Objetivo em Caixas
                </th>

                {/* Meta Financeira */}
                <th colSpan={3} className="px-3 py-1.5 border-b border-r text-center font-bold bg-green-100 text-green-900 border-t">
                  Meta Financeira
                </th>

                {/* Desafio Dist. */}
                <th colSpan={3} className="px-3 py-1.5 border-b border-r text-center font-bold bg-blue-100 text-blue-900 border-t">
                  Desafio Distribuição Numérica
                </th>

                {/* Preço médio */}
                <th colSpan={3} className="px-3 py-1.5 border-b text-center font-bold bg-purple-100 text-purple-900 border-t">
                  Financeiro Detalhado
                </th>
              </tr>
              <tr className="bg-slate-50 text-[10px] text-slate-600 uppercase tracking-wide">
                <th className="px-2 py-1.5 border-b border-r text-right">Volume Cx</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Venda Real.</th>
                <th className="px-2 py-1.5 border-b border-r text-right">% Real.</th>
                <th className="px-2 py-1.5 border-b border-r text-right bg-yellow-50">Meta Dia (Cx)</th>

                <th className="px-2 py-1.5 border-b border-r text-right">Meta R$</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-2 py-1.5 border-b border-r text-right">% Real.</th>

                <th className="px-2 py-1.5 border-b border-r text-right">Desafio</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Falta</th>

                <th className="px-2 py-1.5 border-b border-r text-right">Meta R$</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Real R$</th>
                <th className="px-2 py-1.5 border-b text-right">Preço Médio</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-slate-400">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              )}
              {tableData.map((row, idx) => {

                const isCxBad = row.metaCx > 0 && row.pctCx < pctIdeal;
                const isFinBad = row.metaFin > 0 && row.pctFin < pctIdeal;
                const isDistBad = row.desafioDist > 0 && row.realDist < row.desafioDist * (pctIdeal / 100);

                return (
                  <tr
                    key={row.nome}
                    className={`border-b transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40`}
                  >
                    <td className="px-2 py-2 border-r text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 border-r font-semibold text-slate-800 whitespace-nowrap max-w-[150px] truncate">
                      {row.nome}
                    </td>

                    {/* Caixas */}
                    <td className="px-2 py-2 border-r text-right font-mono text-slate-700">{fmtNum2(row.metaCx || 0)}</td>
                    <td className="px-2 py-2 border-r text-right font-mono font-semibold text-slate-900">{fmtNum2(row.realCx)}</td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-bold ${row.metaCx > 0 ? (isCxBad ? "text-rose-600 bg-rose-50" : "text-emerald-600") : "text-slate-400"}`}>
                      {row.metaCx > 0 ? fmtPct(row.pctCx) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono bg-yellow-50 text-yellow-800 font-bold">
                      {row.metaDiaCx > 0 ? fmtNum2(row.metaDiaCx) : "-"}
                    </td>

                    {/* Financeiro */}
                    <td className="px-2 py-2 border-r text-right font-mono text-slate-500">
                      {row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono font-semibold text-slate-900">
                      {fmtCur(row.realFin)}
                    </td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-bold ${row.metaFin > 0 ? (isFinBad ? "text-rose-600 bg-rose-50" : "text-emerald-700") : "text-slate-400"}`}>
                      {row.metaFin > 0 ? fmtPct(row.pctFin) : "-"}
                    </td>

                    {/* Distribuição */}
                    <td className="px-2 py-2 border-r text-right font-mono text-slate-500">
                      {row.desafioDist > 0 ? fmtNum0(row.desafioDist) : "-"}
                    </td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-semibold ${isDistBad ? "text-rose-600" : "text-slate-900"}`}>
                      {fmtNum0(row.realDist)}
                    </td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-bold ${row.faltaDist > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                      {row.desafioDist > 0 ? (row.faltaDist > 0 ? fmtNum0(row.faltaDist) : "✓") : "-"}
                    </td>

                    {/* Financeiro Detalhado */}
                    <td className="px-2 py-2 border-r text-right font-mono text-purple-600">
                      {row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono text-purple-900 font-semibold">
                      {fmtCur(row.realFin)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-slate-700">
                      {row.precoMedio > 0 ? fmtCur(row.precoMedio) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Rodapé */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-600">
                <td colSpan={2} className="px-3 py-3 text-xs uppercase tracking-wider">
                  TOTAL &gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;
                </td>
                <td className="px-2 py-3 text-right font-mono">{fmtNum2(totalMetaCx)}</td>
                <td className="px-2 py-3 text-right font-mono">{fmtNum2(totalRealCx)}</td>
                <td className={`px-2 py-3 text-right font-mono ${totalPctCx >= pctIdeal ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalMetaCx > 0 ? fmtPct(totalPctCx) : "-"}
                </td>
                <td className="px-2 py-3" />

                <td className="px-2 py-3 text-right font-mono text-amber-300">{fmtCur(totalMetaFin)}</td>
                <td className="px-2 py-3 text-right font-mono text-emerald-300">{fmtCur(totalRealFin)}</td>
                <td className={`px-2 py-3 text-right font-mono ${totalPctFin >= pctIdeal ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmtPct(totalPctFin)}
                </td>
                <td colSpan={6} className="px-2 py-3 text-right text-slate-400 text-[10px]">
                  **Proporcional acima 90%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
