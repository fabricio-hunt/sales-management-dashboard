import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, CheckCircle2, AlertCircle, DollarSign, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const revalidate = 0; // Dynamic route

// Helper function to fetch all vendas efficiently
async function fetchAllVendas() {
  let allVendas: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("vendas")
      .select("venda_liq, qtde, cliente_id, is_positivacao, produtos(fornecedor_nome)")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching vendas:", error);
      break;
    }

    if (data && data.length > 0) {
      allVendas = allVendas.concat(data);
    }

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allVendas;
}

export default async function EquipePage() {
  const vendas = await fetchAllVendas();

  // Obter total de clientes
  const { count: totalClientes, error: errorClientes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  const baseDeClientes = totalClientes || 0;

  // Set de clientes únicos positivados
  const clientesPositivadosSet = new Set<string>();
  let receitaTotal = 0;

  // Estrutura para agrupar dados por fornecedor
  const fornecedoresMap: Record<
    string,
    {
      realCx: number;
      realFin: number;
      clientes: Set<string>;
    }
  > = {};

  vendas.forEach((v) => {
    // Positivação
    if (v.is_positivacao === 1 && v.cliente_id) {
      clientesPositivadosSet.add(v.cliente_id);
    }

    // Receita total para ticket médio (dos positivados)
    // Se Ticket médio é da venda toda ou só do que positivou?
    // Vou contar a receita líquida total para a métrica de ticket médio.
    const vendaLiq = Number(v.venda_liq) || 0;
    const qtde = Number(v.qtde) || 0;
    receitaTotal += vendaLiq;

    // Agrupamento por Fornecedor
    // Tratamento para caso o produto/fornecedor seja nulo
    const fornecedorNome = Array.isArray(v.produtos) 
      ? v.produtos[0]?.fornecedor_nome 
      : v.produtos?.fornecedor_nome;
      
    const fornecedorKey = fornecedorNome || "OUTROS";

    if (!fornecedoresMap[fornecedorKey]) {
      fornecedoresMap[fornecedorKey] = {
        realCx: 0,
        realFin: 0,
        clientes: new Set<string>(),
      };
    }

    fornecedoresMap[fornecedorKey].realCx += qtde;
    fornecedoresMap[fornecedorKey].realFin += vendaLiq;
    if (v.cliente_id) {
      fornecedoresMap[fornecedorKey].clientes.add(v.cliente_id);
    }
  });

  const positivadosCount = clientesPositivadosSet.size;
  const faltaPositivar = Math.max(0, baseDeClientes - positivadosCount);
  const ticketMedio = positivadosCount > 0 ? receitaTotal / positivadosCount : 0;
  
  // Cálculo do percentual de positivação
  const pctPositivacao = baseDeClientes > 0 ? (positivadosCount / baseDeClientes) * 100 : 0;

  // --- Dicionário de Metas Estáticas baseado no Mock Original ---
  const METAS: Record<string, { metaCx: number; metaFin: number }> = {
    "MARATA - EXCLUSIVA": { metaCx: 8090, metaFin: 139151.72 },
    "MARATA VAREJO": { metaCx: 1585, metaFin: 49453.6 },
    "CHEF CLAY / MACRO": { metaCx: 1400, metaFin: 27951.04 },
    "SUKEST": { metaCx: 535, metaFin: 24209.68 },
    "NITA": { metaCx: 450, metaFin: 22446.4 },
    "NISSIN": { metaCx: 300, metaFin: 26521.84 },
  };

  // Montar array para a tabela
  const tableData = Object.entries(fornecedoresMap).map(([fornecedor, dados]) => {
    // Buscar metas ou usar 0
    const metaCx = METAS[fornecedor]?.metaCx || 0;
    const metaFin = METAS[fornecedor]?.metaFin || 0;

    const pctCx = metaCx > 0 ? (dados.realCx / metaCx) * 100 : 0;
    const pctFin = metaFin > 0 ? (dados.realFin / metaFin) * 100 : 0;

    return {
      fornecedor,
      metaCx,
      realCx: dados.realCx,
      pctCx,
      metaFin,
      realFin: dados.realFin,
      pctFin,
      dist: dados.clientes.size,
    };
  });

  // Ordenar tabela pelo maior faturamento (realFin) descendente
  tableData.sort((a, b) => b.realFin - a.realFin);

  // Formatting helpers
  const fmtPct = (val: number) => `${val.toFixed(2)}%`;
  const fmtCur = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  const fmtNum = (val: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Visão Equipe (Dinâmica)
          </h1>
          <p className="text-slate-400 mt-1">Período: Histórico Completo</p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-slate-400 uppercase font-semibold text-xs mb-1">Dias Úteis</p>
            <p className="text-2xl font-bold">22</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 uppercase font-semibold text-xs mb-1">Dias Trabalhados</p>
            <p className="text-2xl font-bold text-blue-400">5</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 uppercase font-semibold text-xs mb-1">% Transcorrido</p>
            <p className="text-2xl font-bold text-emerald-400">22.73%</p>
          </div>
        </div>
      </div>

      {/* SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Base de Clientes (Cadastros)
              <Target className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{fmtNum(baseDeClientes)}</div>
            <p className="text-xs text-slate-500 mt-1">Total na base de dados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Clientes Positivados
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-slate-800">{fmtNum(positivadosCount)}</div>
              <span className="text-sm font-semibold text-emerald-600">
                ({fmtPct(pctPositivacao)})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Compraram no histórico</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Falta Positivar
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{fmtNum(faltaPositivar)}</div>
            <p className="text-xs text-slate-500 mt-1">Clientes sem compra</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Ticket Médio
              <DollarSign className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{fmtCur(ticketMedio)}</div>
            <p className="text-xs text-slate-500 mt-1">Média por cliente positivado</p>
          </CardContent>
        </Card>
      </div>

      {/* MATRIX TABLE (Data Grid representation) */}
      <Card className="overflow-hidden">
        <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Metas e Realizado por Fornecedor
          </h2>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border">
            Mostrando {tableData.length} fornecedores
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs sticky top-0 shadow-sm">
              {/* Header Grouping */}
              <tr>
                <th className="px-4 py-3 border-r font-bold text-slate-800 w-1/4">Fornecedor</th>
                <th
                  colSpan={3}
                  className="px-4 py-3 border-r text-center font-bold bg-blue-50 text-blue-800"
                >
                  Foco Caixas (Volume)
                </th>
                <th
                  colSpan={3}
                  className="px-4 py-3 border-r text-center font-bold bg-emerald-50 text-emerald-800"
                >
                  Foco Financeiro (R$)
                </th>
                <th className="px-4 py-3 text-center font-bold bg-amber-50 text-amber-800">
                  Distribuição
                </th>
              </tr>
              {/* Sub-headers */}
              <tr className="border-b border-t bg-slate-50">
                <th className="px-4 py-2 border-r font-semibold">Nome</th>

                {/* Caixas */}
                <th className="px-4 py-2 border-r text-right">Meta (Cx)</th>
                <th className="px-4 py-2 border-r text-right">Real (Cx)</th>
                <th className="px-4 py-2 border-r text-right">%</th>

                {/* Fin */}
                <th className="px-4 py-2 border-r text-right">Meta (R$)</th>
                <th className="px-4 py-2 border-r text-right">Real (R$)</th>
                <th className="px-4 py-2 border-r text-right">%</th>

                {/* Dist */}
                <th className="px-4 py-2 text-right">Positivados</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhum dado de venda encontrado.
                  </td>
                </tr>
              )}
              {tableData.map((row, idx) => {
                // Conditional formatting logic matching Excel
                const isCxBad = row.pctCx < 22.73; // Less than % days passed
                const isFinBad = row.pctFin < 22.73;

                return (
                  <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-r font-medium text-slate-900">
                      {row.fornecedor}
                    </td>

                    {/* Caixas */}
                    <td className="px-4 py-3 border-r text-right font-mono text-slate-600">
                      {row.metaCx > 0 ? fmtNum(row.metaCx) : "-"}
                    </td>
                    <td className="px-4 py-3 border-r text-right font-mono font-medium text-slate-900">
                      {fmtNum(row.realCx)}
                    </td>
                    <td
                      className={`px-4 py-3 border-r text-right font-mono font-bold ${
                        row.metaCx > 0 && isCxBad
                          ? "text-rose-600 bg-rose-50"
                          : row.metaCx > 0
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {row.metaCx > 0 ? fmtPct(row.pctCx) : "-"}
                    </td>

                    {/* Financeiro */}
                    <td className="px-4 py-3 border-r text-right font-mono text-slate-600">
                      {row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}
                    </td>
                    <td className="px-4 py-3 border-r text-right font-mono font-medium text-slate-900">
                      {fmtCur(row.realFin)}
                    </td>
                    <td
                      className={`px-4 py-3 border-r text-right font-mono font-bold ${
                        row.metaFin > 0 && isFinBad
                          ? "text-rose-600 bg-rose-50"
                          : row.metaFin > 0
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      {row.metaFin > 0 ? fmtPct(row.pctFin) : "-"}
                    </td>

                    {/* Distribuição */}
                    <td className="px-4 py-3 text-right font-mono font-medium text-amber-600">
                      {fmtNum(row.dist)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
