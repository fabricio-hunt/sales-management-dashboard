import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { KpiGrid } from "@/components/data-display/KpiGrid";
import { KpiCard } from "@/components/data-display/KpiCard";
import { ChartCard } from "@/components/data-display/ChartCard";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { resolveMes } from "@/lib/periodo";

export const revalidate = 0;

const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtCurShort = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);
const fmtDiaCurto = (data: string) => {
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
};

export default async function FaturamentoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requirePageAccess("analitico.faturamento_dia");
  const supabase = await createServerSupabase();
  const { mes: mesParam } = await searchParams;
  const mes = resolveMes(mesParam);
  const { data: periodo } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle();

  const { data: rows } = periodo
    ? await supabase
        .from("vw_faturamento_diario")
        .select("data_venda, venda_liq, venda_bruta, devolucao, clientes_atendidos")
        .gte("data_venda", periodo.data_inicio)
        .lte("data_venda", periodo.data_fim)
    : { data: [] as { data_venda: string; venda_liq: number; venda_bruta: number; devolucao: number; clientes_atendidos: number }[] };

  const porDia = new Map<string, { venda_liq: number; venda_bruta: number; devolucao: number }>();
  for (const r of rows ?? []) {
    const acc = porDia.get(r.data_venda) ?? { venda_liq: 0, venda_bruta: 0, devolucao: 0 };
    acc.venda_liq += Number(r.venda_liq);
    acc.venda_bruta += Number(r.venda_bruta);
    acc.devolucao += Number(r.devolucao);
    porDia.set(r.data_venda, acc);
  }

  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalMes = dias.reduce((s, [, v]) => s + v.venda_liq, 0);
  const mediaDia = dias.length > 0 ? totalMes / dias.length : 0;
  const melhorDia = dias.reduce<{ data: string; venda_liq: number } | null>((best, [data, v]) => {
    if (!best || v.venda_liq > best.venda_liq) return { data, venda_liq: v.venda_liq };
    return best;
  }, null);

  const chartData = dias.map(([data, v]) => ({ label: fmtDiaCurto(data), value: v.venda_liq }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        ajuda="analitico.faturamento_dia"
        title="Faturamento Diário"
        subtitle={`Venda líquida por dia — ${mes.slice(0, 7)}`}
        actions={<MesFilter mes={mes} />}
      />

      <KpiGrid>
        <KpiCard label="Total do mês" value={fmtCurShort(totalMes)} hint={fmtCur(totalMes)} />
        <KpiCard label="Média por dia" value={fmtCurShort(mediaDia)} />
        <KpiCard
          label="Melhor dia"
          value={melhorDia ? fmtCurShort(melhorDia.venda_liq) : "-"}
          hint={melhorDia ? fmtDiaCurto(melhorDia.data) : undefined}
        />
        <KpiCard label="Dias com venda" value={dias.length} />
      </KpiGrid>

      <ChartCard title="Evolução no mês" subtitle={`${dias.length} dia(s) com venda registrada.`} isEmpty={dias.length === 0}>
        <TrendLineChart data={chartData} format="currency-compact" />
      </ChartCard>

      <div className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-base font-medium text-foreground">Detalhe por dia</h3>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Venda Bruta</TableHead>
                <TableHead className="text-right">Devolução</TableHead>
                <TableHead className="text-right">Venda Líquida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Sem vendas no período.
                  </TableCell>
                </TableRow>
              )}
              {dias.map(([data, v]) => (
                <TableRow key={data}>
                  <TableCell className="font-mono text-xs">{data}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmtCur(v.venda_bruta)}</TableCell>
                  <TableCell className="text-right font-mono text-negative">{v.devolucao > 0 ? fmtCur(v.devolucao) : "-"}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{fmtCur(v.venda_liq)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
