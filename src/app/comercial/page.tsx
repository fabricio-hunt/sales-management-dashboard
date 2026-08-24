import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, TrendingUp, DollarSign, Award, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export const revalidate = 0; // Dynamic route

// Helper function to fetch all vendas efficiently
async function fetchAllVendas() {
  let allVendas: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("vendas")
      .select("venda_liq, qtde, cliente_id, representante_id, is_positivacao, representantes(nome)")
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

export default async function ComercialPage() {
  const vendas = await fetchAllVendas();

  // Aggregation
  const repMap: Record<string, { nome: string; faturamento: number; clientes: Set<string> }> = {};
  let totalFaturamento = 0;

  vendas.forEach((v) => {
    const repId = v.representante_id;
    if (!repId) return;

    // Handle array or object for joined table
    const nome = Array.isArray(v.representantes)
      ? v.representantes[0]?.nome
      : v.representantes?.nome;

    const repName = nome || `Rep ${repId}`;

    if (!repMap[repId]) {
      repMap[repId] = { nome: repName, faturamento: 0, clientes: new Set<string>() };
    }

    const valor = Number(v.venda_liq) || 0;
    repMap[repId].faturamento += valor;
    totalFaturamento += valor;

    if (v.is_positivacao === 1 && v.cliente_id) {
      repMap[repId].clientes.add(v.cliente_id);
    }
  });

  // Convert to array
  const ranking = Object.values(repMap).map((rep) => ({
    nome: rep.nome,
    faturamento: rep.faturamento,
    positivacao: rep.clientes.size,
  }));

  // Sort by Faturamento DESC
  ranking.sort((a, b) => b.faturamento - a.faturamento);

  const top1 = ranking.length > 0 ? ranking[0] : null;
  const maxFaturamento = top1 ? top1.faturamento : 0;
  const numReps = ranking.length;
  const mediaFaturamento = numReps > 0 ? totalFaturamento / numReps : 0;

  const fmtCur = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat("pt-BR").format(val);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            Ranking de Representantes
          </h1>
          <p className="text-slate-400 mt-1">Acompanhamento de performance de vendas e positivação.</p>
        </div>
      </div>

      {/* SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Faturamento da Equipe
              <DollarSign className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{fmtCur(totalFaturamento)}</div>
            <p className="text-xs text-slate-500 mt-1">Soma de todas as vendas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Ticket Médio por Representante
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{fmtCur(mediaFaturamento)}</div>
            <p className="text-xs text-slate-500 mt-1">Faturamento médio</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Top 1 Performer
              <Award className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800 truncate">{top1 ? top1.nome : "-"}</div>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              {top1 ? fmtCur(top1.faturamento) : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
              Representantes Ativos
              <Users className="w-4 h-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{fmtNum(numReps)}</div>
            <p className="text-xs text-slate-500 mt-1">Com vendas registradas</p>
          </CardContent>
        </Card>
      </div>

      {/* RANKING TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Performance baseada no faturamento. O progresso é relativo ao 1º colocado no ranking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Posição</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Clientes Positivados</TableHead>
                <TableHead className="text-right">Faturamento (R$)</TableHead>
                <TableHead className="w-[30%]">Progresso vs Top 1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum representante encontrado com vendas.
                  </TableCell>
                </TableRow>
              )}
              {ranking.map((rep, idx) => {
                const isTop3 = idx < 3;
                const positionColor = 
                  idx === 0 ? "text-amber-500 font-black text-xl" :
                  idx === 1 ? "text-slate-400 font-bold text-lg" :
                  idx === 2 ? "text-amber-700 font-bold text-lg" : "text-slate-600 font-medium";
                
                const percent = maxFaturamento > 0 ? (rep.faturamento / maxFaturamento) * 100 : 0;

                return (
                  <TableRow key={idx}>
                    <TableCell className={`text-center ${positionColor}`}>
                      #{idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {rep.nome}
                      {idx === 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Líder</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {fmtNum(rep.positivacao)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      {fmtCur(rep.faturamento)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Progress value={percent} className="h-2" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-12 text-right">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
