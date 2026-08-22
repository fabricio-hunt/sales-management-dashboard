import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, CheckCircle2, AlertCircle, DollarSign, Package } from "lucide-react";

export default function EquipeMockup() {
  // Mock data for the table based on the Excel 'RPA 308' tab
  const mockTableData = [
    { fornecedor: "MARATA - EXCLUSIVA", metaCx: 8090, realCx: 1530.76, pctCx: 18.92, metaFin: 139151.72, realFin: 28835.40, pctFin: 20.72, dist: 53.64 },
    { fornecedor: "MARATA VAREJO", metaCx: 1585, realCx: 226.79, pctCx: 14.31, metaFin: 49453.60, realFin: 7856.33, pctFin: 15.89, dist: 13.91 },
    { fornecedor: "CHEF CLAY / MACRO", metaCx: 1400, realCx: 290.00, pctCx: 20.71, metaFin: 27951.04, realFin: 6511.23, pctFin: 23.30, dist: 17.55 },
    { fornecedor: "SUKEST", metaCx: 535, realCx: 153.29, pctCx: 28.65, metaFin: 24209.68, realFin: 6738.99, pctFin: 27.84, dist: 31.13 },
    { fornecedor: "NITA", metaCx: 450, realCx: 172.50, pctCx: 38.33, metaFin: 22446.40, realFin: 8645.72, pctFin: 38.52, dist: 11.92 },
    { fornecedor: "NISSIN", metaCx: 300, realCx: 104.92, pctCx: 34.97, metaFin: 26521.84, realFin: 8859.34, pctFin: 33.40, dist: 14.57 },
  ];

  // Formatting helpers
  const fmtPct = (val: number) => `${val.toFixed(2)}%`;
  const fmtCur = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Visão Equipe (RPA 308)
          </h1>
          <p className="text-slate-400 mt-1">Período: 01/08/2026 a 31/08/2026</p>
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
              Base de Clientes
              <Target className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">1,509</div>
            <p className="text-xs text-slate-500 mt-1">Positivação Alvo</p>
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
              <div className="text-3xl font-bold text-slate-800">460</div>
              <span className="text-sm font-semibold text-emerald-600">(30.48%)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Já compraram no mês</p>
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
            <div className="text-3xl font-bold text-rose-600">1,049</div>
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
            <div className="text-3xl font-bold text-slate-800">{fmtCur(460.65)}</div>
            <p className="text-xs text-slate-500 mt-1">Média por cliente (20/80)</p>
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
            Mostrando 6 de 32 fornecedores
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              {/* Header Grouping */}
              <tr>
                <th className="px-4 py-3 border-r font-bold text-slate-800 w-1/4">Fornecedor</th>
                <th colSpan={3} className="px-4 py-3 border-r text-center font-bold bg-blue-50 text-blue-800">
                  Foco Caixas (Volume)
                </th>
                <th colSpan={3} className="px-4 py-3 border-r text-center font-bold bg-emerald-50 text-emerald-800">
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
                <th className="px-4 py-2 text-right">Realizado</th>
              </tr>
            </thead>
            <tbody>
              {mockTableData.map((row, idx) => {
                // Conditional formatting logic matching Excel
                const isCxBad = row.pctCx < 22.73; // Less than % days passed
                const isFinBad = row.pctFin < 22.73;

                return (
                  <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 border-r font-medium text-slate-900">{row.fornecedor}</td>
                    
                    {/* Caixas */}
                    <td className="px-4 py-3 border-r text-right font-mono text-slate-600">{fmtNum(row.metaCx)}</td>
                    <td className="px-4 py-3 border-r text-right font-mono font-medium text-slate-900">{fmtNum(row.realCx)}</td>
                    <td className={`px-4 py-3 border-r text-right font-mono font-bold ${isCxBad ? 'text-rose-600 bg-rose-50' : 'text-emerald-600'}`}>
                      {fmtPct(row.pctCx)}
                    </td>

                    {/* Financeiro */}
                    <td className="px-4 py-3 border-r text-right font-mono text-slate-600">{fmtCur(row.metaFin)}</td>
                    <td className="px-4 py-3 border-r text-right font-mono font-medium text-slate-900">{fmtCur(row.realFin)}</td>
                    <td className={`px-4 py-3 border-r text-right font-mono font-bold ${isFinBad ? 'text-rose-600 bg-rose-50' : 'text-emerald-600'}`}>
                      {fmtPct(row.pctFin)}
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
