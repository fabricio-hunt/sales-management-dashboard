import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiGrid } from "@/components/data-display/KpiGrid";
import { KpiCard } from "@/components/data-display/KpiCard";
import { ChartCard } from "@/components/data-display/ChartCard";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function DevolucoesPage() {
  const mes = mesAtual();
  const { data: periodo } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle();

  const { data: rows } = periodo
    ? await supabase
        .from("vendas")
        .select("motivo_devolucao, devolucao, cliente_id")
        .gte("data_venda", periodo.data_inicio)
        .lte("data_venda", periodo.data_fim)
        .gt("devolucao", 0)
    : { data: [] as { motivo_devolucao: string | null; devolucao: number; cliente_id: string }[] };

  const porMotivo = new Map<string, { valor: number; ocorrencias: number; clientes: Set<string> }>();
  let totalDevolucao = 0;
  const clientesAfetados = new Set<string>();
  for (const r of rows ?? []) {
    const motivo = r.motivo_devolucao || "Sem motivo informado";
    const acc = porMotivo.get(motivo) ?? { valor: 0, ocorrencias: 0, clientes: new Set() };
    acc.valor += Number(r.devolucao);
    acc.ocorrencias += 1;
    acc.clientes.add(r.cliente_id);
    porMotivo.set(motivo, acc);
    totalDevolucao += Number(r.devolucao);
    clientesAfetados.add(r.cliente_id);
  }

  const ranking = [...porMotivo.entries()]
    .map(([motivo, v]) => ({ motivo, valor: v.valor, ocorrencias: v.ocorrencias, clientes: v.clientes.size }))
    .sort((a, b) => b.valor - a.valor);

  const chartData = ranking.slice(0, 8).map((r) => ({ label: r.motivo, value: r.valor }));

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Devoluções de Vendas" subtitle={`Motivos de devolução — ${mes.slice(0, 7)}`} />

      <KpiGrid>
        <KpiCard label="Total devolvido" value={fmtCur(totalDevolucao)} />
        <KpiCard label="Ocorrências" value={ranking.reduce((s, r) => s + r.ocorrencias, 0)} />
        <KpiCard label="Clientes afetados" value={clientesAfetados.size} />
        <KpiCard label="Motivos distintos" value={ranking.length} />
      </KpiGrid>

      <ChartCard title="Valor devolvido por motivo" subtitle="Top motivos no período." isEmpty={chartData.length === 0}>
        <CategoryBarChart data={chartData} format="currency-compact" color="#DC2626" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Por motivo</CardTitle>
          <CardDescription>Depende da coluna &quot;Descr.Motivo&quot; vinda no export do ERP no import.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Ocorrências</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma devolução no período.</TableCell></TableRow>
              )}
              {ranking.map((r) => (
                <TableRow key={r.motivo}>
                  <TableCell className="font-medium">{r.motivo}</TableCell>
                  <TableCell className="text-right font-mono">{r.ocorrencias}</TableCell>
                  <TableCell className="text-right font-mono">{r.clientes}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-negative">{fmtCur(r.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
