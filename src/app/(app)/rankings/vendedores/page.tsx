import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { ChartCard } from "@/components/data-display/ChartCard";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { resolveMes } from "@/lib/periodo";

export const revalidate = 0;

// Mesmo critério já validado de /rankings/financeiro (financeiro realizado),
// só que limitado ao top 10 — ver decisão registrada no plano de v2.
export default async function RankingVendedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requirePageAccess("rankings.vendedores");
  const supabase = await createServerSupabase();
  const { mes: mesParam } = await searchParams;
  const mes = resolveMes(mesParam);

  const [{ data: financeiro }, { data: metas }, { data: reps }] = await Promise.all([
    supabase.from("vw_financeiro_representante").select("*").eq("mes", mes),
    supabase.from("metas").select("representante_id, meta_fin").eq("mes", mes),
    supabase.from("representantes").select("id, nome"),
  ]);

  const repNome = new Map((reps ?? []).map((r) => [r.id, r.nome]));
  const metaByRep = new Map<string, number>();
  for (const m of metas ?? []) {
    metaByRep.set(m.representante_id, (metaByRep.get(m.representante_id) ?? 0) + Number(m.meta_fin));
  }

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  const ranking = (financeiro ?? [])
    .map((r) => {
      const meta = metaByRep.get(r.representante_id) ?? 0;
      const pct = meta > 0 ? (Number(r.venda_liq) / meta) * 100 : 0;
      return {
        representante_id: r.representante_id,
        nome: repNome.get(r.representante_id) ?? r.representante_id,
        venda_liq: Number(r.venda_liq),
        meta,
        pct,
      };
    })
    .sort((a, b) => b.venda_liq - a.venda_liq)
    .slice(0, 10);

  const chartData = ranking.map((r) => ({ label: r.nome, value: r.venda_liq }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        ajuda="rankings.vendedores"
        title="Top 10 Vendedores"
        subtitle={`Ranking dos vendedores com melhor desempenho financeiro — ${mes.slice(0, 7)}`}
        actions={<MesFilter mes={mes} />}
      />

      <ChartCard title="Faturamento — top 10" isEmpty={chartData.length === 0}>
        <CategoryBarChart data={chartData} format="currency-compact" color="#10B981" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Mesmo critério de /rankings/financeiro (faturamento líquido), limitado ao top 10.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Pos.</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Meta</TableHead>
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
                  <TableCell className="text-right font-mono text-muted-foreground">{r.meta > 0 ? fmtCur(r.meta) : "-"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtCur(r.venda_liq)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${r.pct >= 100 ? "text-positive" : r.pct >= 60 ? "text-amber-600" : "text-negative"}`}>
                    {r.meta > 0 ? fmtPct(r.pct) : "-"}
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
