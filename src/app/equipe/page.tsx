import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const revalidate = 0;

// --- CONFIGURAÇÃO ESTÁTICA DO PERÍODO ---
// Ajuste manualmente para refletir o mês vigente
const PERIODO = {
  inicio: "2026-08-01",
  fim: "2026-08-31",
  label: "01/08/2026 a 31/08/2026",
  diasUteis: 21,
  regiao: "Jundiaí",
};

// --- METAS POR FORNECEDOR ---
// Estrutura: { metaCx, metaFin, desafioDistribuicao (clientes) }
const METAS_FORNECEDOR: Record<
  string,
  { metaCx: number; metaFin: number; desafioDist: number; grupo?: string }
> = {
  "Chef Clay":           { metaCx: 0,    metaFin: 26491,  desafioDist: 182, grupo: "CHEF CLAY/MACRO" },
  "Chef Clay Granola":   { metaCx: 0,    metaFin: 434,    desafioDist: 56,  grupo: "CHEF CLAY/MACRO" },
  "Chef Clay Molhos":    { metaCx: 0,    metaFin: 14227,  desafioDist: 110, grupo: "CHEF CLAY/MACRO" },
  "Tapioca Chef Clay":   { metaCx: 0,    metaFin: 5901,   desafioDist: 40,  grupo: "CHEF CLAY/MACRO" },
  "Chef Clay de Coco":   { metaCx: 0,    metaFin: 9467,   desafioDist: 92,  grupo: "CHEF CLAY/MACRO" },
  "Casaredo":            { metaCx: 0,    metaFin: 18763,  desafioDist: 144, grupo: "CASAREDO" },
  "Coco & Cia":          { metaCx: 0,    metaFin: 44629,  desafioDist: 100, grupo: "CASAREDO" },
  "Riclan":              { metaCx: 0,    metaFin: 99503,  desafioDist: 370, grupo: "CASAREDO" },
  "ZD Alimentos":        { metaCx: 0,    metaFin: 37165,  desafioDist: 266, grupo: "CASAREDO" },
  "Portao de Cambui":    { metaCx: 0,    metaFin: 74925,  desafioDist: 310, grupo: "CASAREDO" },
  "Ebicen":              { metaCx: 0,    metaFin: 21262,  desafioDist: 180, grupo: "CASAREDO" },
  "Montevergine":        { metaCx: 0,    metaFin: 25792,  desafioDist: 226, grupo: "OUTROS" },
  "Neugebauer":          { metaCx: 0,    metaFin: 86978,  desafioDist: 212, grupo: "OUTROS" },
  "Dgoias":              { metaCx: 0,    metaFin: 19204,  desafioDist: 72,  grupo: "OUTROS" },
  "Bretzke":             { metaCx: 0,    metaFin: 0,      desafioDist: 112, grupo: "OUTROS" },
  "Bricoflex":           { metaCx: 0,    metaFin: 0,      desafioDist: 84,  grupo: "OUTROS" },
  "Vibe":                { metaCx: 0,    metaFin: 11395,  desafioDist: 36,  grupo: "OUTROS" },
  "Delicia Nordestina":  { metaCx: 0,    metaFin: 25978,  desafioDist: 42,  grupo: "OUTROS" },
  "Toshiba":             { metaCx: 0,    metaFin: 13654,  desafioDist: 76,  grupo: "OUTROS" },
  "Danilla":             { metaCx: 0,    metaFin: 24375,  desafioDist: 184, grupo: "OUTROS" },
  "Dizioli":             { metaCx: 0,    metaFin: 53741,  desafioDist: 266, grupo: "OUTROS" },
  "Morochan":            { metaCx: 0,    metaFin: 12684,  desafioDist: 64,  grupo: "OUTROS" },
  "Kohber":              { metaCx: 0,    metaFin: 12215,  desafioDist: 102, grupo: "OUTROS" },
  "Fampar":              { metaCx: 0,    metaFin: 12000,  desafioDist: 108, grupo: "OUTROS" },
  "Saleique":            { metaCx: 0,    metaFin: 10121,  desafioDist: 36,  grupo: "OUTROS" },
  "Marata":              { metaCx: 1500, metaFin: 78748,  desafioDist: 256, grupo: "MARATA" },
};

// Meta global financeira (soma das metas ou fixo)
const META_FINANCEIRA_TOTAL = 737840;
const OBJ_POSITIVACAO = 805;
const BASE_ATIVA = 1214;

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

    if (error) { console.error("Error fetching vendas:", error); break; }
    if (data && data.length > 0) allVendas = allVendas.concat(data);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return allVendas;
}

export default async function EquipePage() {
  const vendas = await fetchAllVendas();

  // --- Total de cadastros ---
  const { count: totalClientes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });
  const cadastroTotal = totalClientes || 0;

  // --- Dias faturados (dias únicos com vendas no período) ---
  const diasComVendasSet = new Set<string>();
  const clientesPositivadosSet = new Set<string>();
  let receitaTotal = 0;

  const fornecedoresMap: Record<string, {
    realCx: number;
    realFin: number;
    clientes: Set<string>;
    precoMedioNumerador: number; // soma de venda_liq
    precoMedioDenominador: number; // soma de qtde
  }> = {};

  vendas.forEach((v) => {
    const dt = v.data_venda as string;
    if (dt) diasComVendasSet.add(dt);

    if (v.is_positivacao === 1 && v.cliente_id) {
      clientesPositivadosSet.add(v.cliente_id);
    }

    const vendaLiq = Number(v.venda_liq) || 0;
    const qtde = Number(v.qtde) || 0;
    receitaTotal += vendaLiq;

    const fornecedorNome = Array.isArray(v.produtos)
      ? v.produtos[0]?.fornecedor_nome
      : v.produtos?.fornecedor_nome;
    const fornecedorKey = fornecedorNome || "OUTROS";

    if (!fornecedoresMap[fornecedorKey]) {
      fornecedoresMap[fornecedorKey] = {
        realCx: 0,
        realFin: 0,
        clientes: new Set<string>(),
        precoMedioNumerador: 0,
        precoMedioDenominador: 0,
      };
    }

    fornecedoresMap[fornecedorKey].realCx += qtde;
    fornecedoresMap[fornecedorKey].realFin += vendaLiq;
    if (v.cliente_id) fornecedoresMap[fornecedorKey].clientes.add(v.cliente_id);
    fornecedoresMap[fornecedorKey].precoMedioNumerador += vendaLiq;
    fornecedoresMap[fornecedorKey].precoMedioDenominador += qtde;
  });

  const diasFaturado = diasComVendasSet.size;
  const diasRestam = Math.max(0, PERIODO.diasUteis - diasFaturado);
  const pctIdeal = PERIODO.diasUteis > 0 ? (diasFaturado / PERIODO.diasUteis) * 100 : 0;

  const positivadosCount = clientesPositivadosSet.size;
  const faltaPositivar = Math.max(0, OBJ_POSITIVACAO - positivadosCount);
  const pctPositivacaoRealizado = OBJ_POSITIVACAO > 0 ? (positivadosCount / OBJ_POSITIVACAO) * 100 : 0;

  const pctFinanceiroRealizado = META_FINANCEIRA_TOTAL > 0 ? (receitaTotal / META_FINANCEIRA_TOTAL) * 100 : 0;

  // Projeção de fechamento: realizado / dias faturados * dias úteis totais
  const projecaoFechamento = diasFaturado > 0 ? (receitaTotal / diasFaturado) * PERIODO.diasUteis : 0;
  const pctProjecao = META_FINANCEIRA_TOTAL > 0 ? (projecaoFechamento / META_FINANCEIRA_TOTAL) * 100 : 0;

  // Necessidade de venda por dia para bater a meta
  const faltaFinanceiro = Math.max(0, META_FINANCEIRA_TOTAL - receitaTotal);
  const necessidadeVendaDia = diasRestam > 0 ? faltaFinanceiro / diasRestam : 0;

  // Montar tabela
  const tableData = Object.entries(fornecedoresMap).map(([fornecedor, dados]) => {
    const meta = METAS_FORNECEDOR[fornecedor];
    const metaCx = meta?.metaCx || 0;
    const metaFin = meta?.metaFin || 0;
    const desafioDist = meta?.desafioDist || 0;
    const grupo = meta?.grupo || "OUTROS";

    const pctFin = metaFin > 0 ? (dados.realFin / metaFin) * 100 : 0;
    const pctCx = metaCx > 0 ? (dados.realCx / metaCx) * 100 : 0;
    const realDist = dados.clientes.size;
    const faltaDist = Math.max(0, desafioDist - realDist);
    const precoMedio = dados.precoMedioDenominador > 0
      ? dados.precoMedioNumerador / dados.precoMedioDenominador
      : 0;

    // Meta dia em caixas = metaCx / diasUteis
    const metaDiaCx = PERIODO.diasUteis > 0 ? metaCx / PERIODO.diasUteis : 0;

    return {
      fornecedor,
      grupo,
      metaCx,
      realCx: dados.realCx,
      pctCx,
      metaDiaCx,
      metaFin,
      realFin: dados.realFin,
      pctFin,
      desafioDist,
      realDist,
      faltaDist,
      precoMedio,
    };
  });

  tableData.sort((a, b) => b.realFin - a.realFin);

  // Totais para rodapé
  const totalMetaFin = tableData.reduce((s, r) => s + r.metaFin, 0);
  const totalRealFin = tableData.reduce((s, r) => s + r.realFin, 0);
  const totalRealCx = tableData.reduce((s, r) => s + r.realCx, 0);
  const totalPctFin = totalMetaFin > 0 ? (totalRealFin / totalMetaFin) * 100 : 0;

  // Formatters
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;
  const fmtCur = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtNum = (v: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
  const fmtDec = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  // Badge do % realizado
  const FinBadge = ({ val, meta }: { val: number; meta: number }) => {
    if (meta === 0) return <span className="text-slate-400">-</span>;
    const pct = (val / meta) * 100;
    const isGood = pct >= pctIdeal;
    return (
      <span className={`font-bold ${isGood ? "text-emerald-600" : "text-rose-600"}`}>
        {fmtPct(pct)}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ─── HEADER ─── */}
      <div className="bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch">
          {/* Região + Período */}
          <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-slate-700">
            <div className="text-2xl font-black text-white tracking-tight">{PERIODO.regiao}</div>
            <div className="text-slate-400 text-sm mt-1">Período: {PERIODO.label}</div>
          </div>

          {/* Dias */}
          <div className="flex divide-x divide-slate-700">
            <div className="px-6 py-5 text-center">
              <p className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">Dias Úteis</p>
              <p className="text-3xl font-black">{PERIODO.diasUteis}</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">Dias Faturado</p>
              <p className="text-3xl font-black text-blue-400">{diasFaturado}</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">Dias Restam</p>
              <p className="text-3xl font-black text-amber-400">{diasRestam}</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">% Ideal</p>
              <p className="text-3xl font-black text-emerald-400">{fmtPct(pctIdeal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SCORECARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bloco Esquerdo: Positivação */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-slate-100 px-4 py-2 border-b">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Positivação de Clientes</p>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Cadastro Total</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmtNum(cadastroTotal)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Base Ativa</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmtNum(BASE_ATIVA)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Obj. Positivação</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-600">{fmtNum(OBJ_POSITIVACAO)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Realizado Mês</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmtNum(positivadosCount)}</td>
                </tr>
                <tr className="border-b bg-yellow-50 hover:bg-yellow-100">
                  <td className="px-4 py-2.5 text-slate-700 font-bold">Falta Positivar</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">{fmtNum(faltaPositivar)}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">% Realizado</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${pctPositivacaoRealizado >= pctIdeal ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtPct(pctPositivacaoRealizado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Bloco Direito: Financeiro */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-slate-100 px-4 py-2 border-b">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resultado Financeiro</p>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Obj. Financeiro</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-600">{fmtCur(META_FINANCEIRA_TOTAL)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Vda Real. Mês</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmtCur(receitaTotal)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">% Realizado</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${pctFinanceiroRealizado >= pctIdeal ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtPct(pctFinanceiroRealizado)}
                  </td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">Projeção Fech.</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmtCur(projecaoFechamento)}</td>
                </tr>
                <tr className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 font-medium">% Projeção Fech.</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-bold ${pctProjecao >= 100 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtPct(pctProjecao)}
                  </td>
                </tr>
                <tr className="bg-yellow-50 hover:bg-yellow-100">
                  <td className="px-4 py-2.5 text-slate-700 font-bold">Necessidade Venda/dia</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">{fmtCur(necessidadeVendaDia)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ─── TABELA DE FORNECEDORES ─── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">
            Objetivo em Caixas · Meta Financeira · Desafio Distribuição Numérica
          </h2>
          <span className="text-slate-400 text-xs bg-slate-700 px-3 py-1 rounded-full">
            {tableData.length} fornecedores · Período: {PERIODO.label}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 border-b border-r font-bold text-slate-700" rowSpan={2}>CM</th>
                <th className="px-3 py-2 border-b border-r font-bold text-slate-700" rowSpan={2}>Fornecedor</th>

                {/* Objetivo em Caixas */}
                <th colSpan={4} className="px-3 py-2 border-b border-r text-center font-bold bg-yellow-100 text-yellow-900">
                  Objetivo em Caixas
                </th>

                {/* Meta Financeira */}
                <th colSpan={3} className="px-3 py-2 border-b border-r text-center font-bold bg-green-100 text-green-900">
                  Meta Financeira
                </th>

                {/* Desafio Dist. */}
                <th colSpan={3} className="px-3 py-2 border-b border-r text-center font-bold bg-blue-100 text-blue-900">
                  Desafio Distribuição Numérica
                </th>

                {/* Preço médio + Premiação */}
                <th colSpan={3} className="px-3 py-2 border-b text-center font-bold bg-purple-100 text-purple-900">
                  Financeiro Detalhado
                </th>
              </tr>
              <tr className="bg-slate-50 text-[10px] text-slate-600 uppercase">
                <th className="px-3 py-1.5 border-b border-r text-right">Volume Cx</th>
                <th className="px-3 py-1.5 border-b border-r text-right">% Real.</th>
                <th className="px-3 py-1.5 border-b border-r text-right bg-yellow-50 text-yellow-800 font-bold">Meta Dia (Cx)</th>
                <th className="px-3 py-1.5 border-b border-r text-right bg-orange-50 text-orange-800 font-bold">Prem. &gt;80%</th>

                <th className="px-3 py-1.5 border-b border-r text-right">Meta (R$)</th>
                <th className="px-3 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-3 py-1.5 border-b border-r text-right">% Real.</th>

                <th className="px-3 py-1.5 border-b border-r text-right">Desafio</th>
                <th className="px-3 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-3 py-1.5 border-b border-r text-right">Falta</th>

                <th className="px-3 py-1.5 border-b border-r text-right">Meta R$</th>
                <th className="px-3 py-1.5 border-b border-r text-right">Real R$</th>
                <th className="px-3 py-1.5 border-b text-right">Preço Médio</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-12 text-slate-500">
                    Nenhum dado encontrado para o período selecionado.
                  </td>
                </tr>
              )}
              {tableData.map((row, idx) => {
                const isFinBad = row.metaFin > 0 && row.pctFin < pctIdeal;
                const isCxBad = row.metaCx > 0 && row.pctCx < pctIdeal;
                const isDistBad = row.desafioDist > 0 && row.realDist < row.desafioDist * (pctIdeal / 100);
                // Premiação: só conta se acima de 80%
                const premiacaoCx = row.pctCx >= 80 ? row.realFin * 0.01 : 0; // exemplo: 1% do faturamento

                return (
                  <tr
                    key={idx}
                    className={`border-b transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-blue-50/30`}
                  >
                    {/* CM */}
                    <td className="px-3 py-2 border-r text-slate-400 font-mono">{idx + 1}</td>

                    {/* Fornecedor */}
                    <td className="px-3 py-2 border-r font-semibold text-slate-800 max-w-[130px] truncate">
                      {row.fornecedor}
                    </td>

                    {/* Objetivo em Caixas */}
                    <td className="px-3 py-2 border-r text-right font-mono text-slate-700">{fmtDec(row.realCx)}</td>
                    <td className={`px-3 py-2 border-r text-right font-mono font-bold ${row.metaCx > 0 ? (isCxBad ? "text-rose-600" : "text-emerald-600") : "text-slate-400"}`}>
                      {row.metaCx > 0 ? fmtPct(row.pctCx) : "-"}
                    </td>
                    <td className="px-3 py-2 border-r text-right font-mono bg-yellow-50 text-yellow-800 font-bold">
                      {row.metaDiaCx > 0 ? fmtDec(row.metaDiaCx) : "-"}
                    </td>
                    <td className="px-3 py-2 border-r text-right font-mono bg-orange-50 text-orange-700">
                      {row.pctCx >= 80 ? fmtCur(premiacaoCx) : "-"}
                    </td>

                    {/* Meta Financeira */}
                    <td className="px-3 py-2 border-r text-right font-mono text-slate-600">
                      {row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}
                    </td>
                    <td className="px-3 py-2 border-r text-right font-mono font-semibold text-slate-900">
                      {fmtCur(row.realFin)}
                    </td>
                    <td className={`px-3 py-2 border-r text-right font-mono font-bold ${row.metaFin > 0 ? (isFinBad ? "text-rose-600 bg-rose-50" : "text-emerald-700") : "text-slate-400"}`}>
                      {row.metaFin > 0 ? fmtPct(row.pctFin) : "-"}
                    </td>

                    {/* Distribuição */}
                    <td className="px-3 py-2 border-r text-right font-mono text-slate-600">
                      {row.desafioDist > 0 ? fmtNum(row.desafioDist) : "-"}
                    </td>
                    <td className={`px-3 py-2 border-r text-right font-mono font-semibold ${isDistBad ? "text-rose-600" : "text-slate-900"}`}>
                      {fmtNum(row.realDist)}
                    </td>
                    <td className={`px-3 py-2 border-r text-right font-mono ${row.faltaDist > 0 ? "text-rose-500 font-bold" : "text-emerald-600"}`}>
                      {row.desafioDist > 0 ? (row.faltaDist > 0 ? fmtNum(row.faltaDist) : "✓") : "-"}
                    </td>

                    {/* Financeiro Detalhado */}
                    <td className="px-3 py-2 border-r text-right font-mono text-purple-700">
                      {row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}
                    </td>
                    <td className="px-3 py-2 border-r text-right font-mono text-purple-900 font-semibold">
                      {fmtCur(row.realFin)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {row.precoMedio > 0 ? fmtCur(row.precoMedio) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Rodapé totalizador */}
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-600">
                <td colSpan={2} className="px-3 py-3 text-xs uppercase tracking-wider">
                  TOTAL &gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;
                </td>
                <td className="px-3 py-3 text-right font-mono">{fmtDec(totalRealCx)}</td>
                <td className="px-3 py-3 text-right font-mono" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right font-mono text-amber-300">{fmtCur(totalMetaFin)}</td>
                <td className="px-3 py-3 text-right font-mono text-emerald-300">{fmtCur(totalRealFin)}</td>
                <td className={`px-3 py-3 text-right font-mono ${totalPctFin >= pctIdeal ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmtPct(totalPctFin)}
                </td>
                <td colSpan={6} className="px-3 py-3 text-slate-400 text-xs text-right">
                  *Proporcional acima 80%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
