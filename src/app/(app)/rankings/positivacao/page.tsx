import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/data-display/ChartCard";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function RankingPositivacaoPage() {
  await requirePageAccess("rankings.positivacao");
  const supabase = await createServerSupabase();
  const mes = mesAtual();

  const [{ data: positivacao }, { data: metasRep }, { data: reps }] = await Promise.all([
    supabase.from("vw_positivacao_representante").select("*").eq("mes", mes),
    supabase.from("metas_representante").select("*").eq("mes", mes),
    supabase.from("representantes").select("id, nome"),
  ]);

  const repNome = new Map((reps ?? []).map((r) => [r.id, r.nome]));
  const objByRep = new Map((metasRep ?? []).map((m) => [m.representante_id, m.obj_positivacao]));
  // override manual (mesma convenção de cadastro_total_override) tem prioridade sobre o cálculo ao vivo
  const overrideByRep = new Map((metasRep ?? []).map((m) => [m.representante_id, m.positivacao_realizado_override]));

  const ranking = (positivacao ?? [])
    .map((p) => {
      const obj = objByRep.get(p.representante_id) ?? 0;
      const override = overrideByRep.get(p.representante_id);
      const positivados = override != null ? Number(override) : Number(p.positivados);
      const pct = obj > 0 ? (positivados / obj) * 100 : 0;
      return {
        representante_id: p.representante_id,
        nome: repNome.get(p.representante_id) ?? p.representante_id,
        positivados,
        obj,
        pct,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const chartData = ranking.slice(0, 10).map((r) => ({ label: r.nome, value: r.pct }));

  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="rankings.positivacao"
        title="Ranking de Positivação"
        subtitle={`% de atingimento do objetivo de positivação por representante — ${mes.slice(0, 7)}`}
      />

      <ChartCard title="% de atingimento por representante" isEmpty={chartData.length === 0}>
        <CategoryBarChart data={chartData} format="percent" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Calculado ao vivo a partir de vendas (is_positivacao=1), nunca copiado de outra tela.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Pos.</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Objetivo</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem dados pra este período.</TableCell></TableRow>
              )}
              {ranking.map((r, idx) => (
                <TableRow key={r.representante_id}>
                  <TableCell className="text-center font-bold text-muted-foreground">{idx + 1}º</TableCell>
                  <TableCell className="font-semibold">{r.nome}</TableCell>
                  <TableCell className="text-right font-mono">{r.obj}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{r.positivados}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${r.pct >= 100 ? "text-positive" : r.pct >= 60 ? "text-amber-600" : "text-negative"}`}>
                    {fmtPct(r.pct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
