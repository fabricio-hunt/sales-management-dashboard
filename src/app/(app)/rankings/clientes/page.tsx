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

export default async function RankingClientesPage() {
  await requirePageAccess("rankings.clientes");
  const supabase = await createServerSupabase();
  const mes = mesAtual();

  // vw_top_clientes_mes já é RLS-escopada por representante (ver
  // supabase_migration_v2.sql) — um vendedor só recebe os clientes da própria
  // carteira, sem precisar de filtro adicional aqui.
  const { data: rows } = await supabase
    .from("vw_top_clientes_mes")
    .select("*")
    .eq("mes", mes)
    .order("venda_liq", { ascending: false })
    .limit(20);

  const ranking = (rows ?? []).map((r) => ({
    cliente_id: r.cliente_id,
    nome: r.fantasia || r.razao_social || r.cliente_id,
    venda_liq: Number(r.venda_liq),
    qtde: Number(r.qtde),
    diasComCompra: Number(r.dias_com_compra),
    representante_id: r.representante_id,
  }));

  const chartData = ranking.slice(0, 10).map((r) => ({ label: r.nome, value: r.venda_liq }));

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Top 20 Clientes" subtitle={`Ranking dos melhores clientes por faturamento — ${mes.slice(0, 7)}`} />

      <ChartCard title="Top 10 clientes por faturamento" isEmpty={chartData.length === 0}>
        <CategoryBarChart data={chartData} format="currency-compact" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Calculado ao vivo a partir de vendas do mês, nunca copiado de outra tela.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Pos.</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Dias c/ Compra</TableHead>
                <TableHead className="text-right">Qtde</TableHead>
                <TableHead className="text-right">Venda Líquida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem dados pra este período.</TableCell></TableRow>
              )}
              {ranking.map((r, idx) => (
                <TableRow key={r.cliente_id}>
                  <TableCell className="text-center font-bold text-muted-foreground">{idx + 1}º</TableCell>
                  <TableCell className="font-semibold">{r.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{r.representante_id ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono">{r.diasComCompra}</TableCell>
                  <TableCell className="text-right font-mono">{r.qtde.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtCur(r.venda_liq)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
