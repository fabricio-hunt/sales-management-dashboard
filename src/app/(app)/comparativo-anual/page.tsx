import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnoCompareFilter } from "@/components/layout/AnoCompareFilter";
import { KpiGrid } from "@/components/data-display/KpiGrid";
import { KpiCard } from "@/components/data-display/KpiCard";
import { ChartCard } from "@/components/data-display/ChartCard";
import { YearComparisonChart } from "@/components/charts/YearComparisonChart";
import { resolveAnosComparativo } from "@/lib/periodo";

export const revalidate = 0;

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtCurShort = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

type Acc = { venda_liq: number; venda_bruta: number; devolucao: number; pedidos: number };
const ACC_VAZIO: Acc = { venda_liq: 0, venda_bruta: 0, devolucao: 0, pedidos: 0 };

function delta(base: number, atual: number): { value: number; direction: "up" | "down" } | undefined {
  if (!base) return undefined;
  const pct = ((atual - base) / base) * 100;
  return { value: pct, direction: pct >= 0 ? "up" : "down" };
}

// Sem base (ano de comparação zerado), o hint avisa a ausência de dado em vez
// de mostrar o valor completo ao lado de um delta que não existe.
function hintComGuarda(base: number, anoBase: number, valorCompleto: string): string {
  return base === 0 ? `sem dados em ${anoBase}` : valorCompleto;
}

export default async function ComparativoAnualPage({
  searchParams,
}: {
  searchParams: Promise<{ anoA?: string; anoB?: string }>;
}) {
  await requirePageAccess("comparativo.anual");
  const supabase = await createServerSupabase();
  const { anoA: anoAParam, anoB: anoBParam } = await searchParams;
  const { anoA, anoB } = resolveAnosComparativo(anoAParam, anoBParam);

  const anoMin = Math.min(anoA, anoB);
  const anoMax = Math.max(anoA, anoB);

  // Direto na view mensal por ano civil — sem passar por periodos, que exige
  // cadastro manual por mês e não pode bloquear a comparação de um ano que
  // ainda não tem nenhum período registrado.
  const { data: resumoRows } = await supabase
    .from("vw_vendas_mensal_resumo")
    .select("mes, venda_liq, venda_bruta, devolucao, pedidos")
    .gte("mes", `${anoMin}-01-01`)
    .lte("mes", `${anoMax}-12-01`);

  const porMes = new Map<string, Acc>();
  for (const r of resumoRows ?? []) {
    const [anoStr, mesStr] = r.mes.slice(0, 7).split("-");
    const key = `${Number(anoStr)}-${Number(mesStr)}`;
    const acc = porMes.get(key) ?? { ...ACC_VAZIO };
    acc.venda_liq += Number(r.venda_liq);
    acc.venda_bruta += Number(r.venda_bruta);
    acc.devolucao += Number(r.devolucao);
    acc.pedidos += Number(r.pedidos);
    porMes.set(key, acc);
  }

  function totalAno(ano: number): Acc {
    const acc = { ...ACC_VAZIO };
    for (let m = 1; m <= 12; m++) {
      const v = porMes.get(`${ano}-${m}`);
      if (!v) continue;
      acc.venda_liq += v.venda_liq;
      acc.venda_bruta += v.venda_bruta;
      acc.devolucao += v.devolucao;
      acc.pedidos += v.pedidos;
    }
    return acc;
  }

  const totalA = totalAno(anoA);
  const totalB = totalAno(anoB);

  // Clientes positivados no ano: não soma o "positivados" mensal da view
  // (duplicaria cliente que comprou em mais de um mês) — deduplica em JS
  // sobre o ano inteiro, mesmo idioma de agregação já usado nesta tela.
  const [positivadosARows, positivadosBRows] = await Promise.all([
    supabase
      .from("vendas")
      .select("cliente_id")
      .eq("is_positivacao", 1)
      .gte("data_venda", `${anoA}-01-01`)
      .lte("data_venda", `${anoA}-12-31`),
    supabase
      .from("vendas")
      .select("cliente_id")
      .eq("is_positivacao", 1)
      .gte("data_venda", `${anoB}-01-01`)
      .lte("data_venda", `${anoB}-12-31`),
  ]);
  const positivadosA = new Set((positivadosARows.data ?? []).map((r) => r.cliente_id)).size;
  const positivadosB = new Set((positivadosBRows.data ?? []).map((r) => r.cliente_id)).size;

  const ticketA = totalA.pedidos > 0 ? totalA.venda_liq / totalA.pedidos : 0;
  const ticketB = totalB.pedidos > 0 ? totalB.venda_liq / totalB.pedidos : 0;

  // Mês "no futuro" daquele ano (ainda não chegou) vira lacuna no gráfico
  // (null); mês já ocorrido sem linha na view vira 0 — aconteceu e não vendeu
  // nada, o que é um dado real, diferente de "ainda não aconteceu".
  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  const mesHoje = hoje.getMonth() + 1;
  function valorOuNull(ano: number, mesNumero: number): number | null {
    if (ano > anoHoje || (ano === anoHoje && mesNumero > mesHoje)) return null;
    return porMes.get(`${ano}-${mesNumero}`)?.venda_liq ?? 0;
  }

  const chartData = MESES_ABREV.map((label, idx) => ({
    mes: label,
    anoA: valorOuNull(anoA, idx + 1),
    anoB: valorOuNull(anoB, idx + 1),
  }));

  const anoATemDados = totalA.venda_liq > 0 || totalA.venda_bruta > 0 || totalA.pedidos > 0;
  const anoBTemDados = totalB.venda_liq > 0 || totalB.venda_bruta > 0 || totalB.pedidos > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        ajuda="comparativo.anual"
        title="Comparativo Anual"
        subtitle={`${anoA} vs ${anoB}`}
        actions={<AnoCompareFilter anoA={anoA} anoB={anoB} />}
      />

      {!anoATemDados && !anoBTemDados && (
        <Alert variant="bloqueio" titulo="Sem dados para comparar">
          Nenhuma venda registrada em {anoA} nem em {anoB}. Escolha outro par de anos acima ou aguarde a importação
          da base.
        </Alert>
      )}
      {anoATemDados && !anoBTemDados && (
        <Alert variant="aviso">
          Ainda não há vendas registradas em {anoB}. Os números desse ano aparecem zerados até a base ser carregada.
        </Alert>
      )}
      {!anoATemDados && anoBTemDados && (
        <Alert variant="aviso">
          Ainda não há vendas registradas em {anoA}. Os números desse ano aparecem zerados até a base ser carregada.
        </Alert>
      )}

      <KpiGrid>
        <KpiCard
          label="Faturamento líquido"
          value={fmtCurShort(totalB.venda_liq)}
          hint={hintComGuarda(totalA.venda_liq, anoA, fmtCur(totalB.venda_liq))}
          delta={delta(totalA.venda_liq, totalB.venda_liq)}
        />
        <KpiCard
          label="Faturamento bruto"
          value={fmtCurShort(totalB.venda_bruta)}
          hint={hintComGuarda(totalA.venda_bruta, anoA, fmtCur(totalB.venda_bruta))}
          delta={delta(totalA.venda_bruta, totalB.venda_bruta)}
        />
        <KpiCard
          label="Devoluções"
          value={fmtCurShort(totalB.devolucao)}
          hint={hintComGuarda(totalA.devolucao, anoA, fmtCur(totalB.devolucao))}
          delta={delta(totalA.devolucao, totalB.devolucao)}
        />
        <KpiCard
          label="Clientes positivados"
          value={positivadosB}
          delta={delta(positivadosA, positivadosB)}
          hint={positivadosA === 0 ? `sem dados em ${anoA}` : undefined}
        />
        <KpiCard
          label="Ticket médio"
          value={fmtCurShort(ticketB)}
          hint={hintComGuarda(ticketA, anoA, fmtCur(ticketB))}
          delta={delta(ticketA, ticketB)}
        />
      </KpiGrid>

      <ChartCard title="Faturamento líquido por mês" isEmpty={!anoATemDados && !anoBTemDados}>
        <YearComparisonChart data={chartData} anoALabel={String(anoA)} anoBLabel={String(anoB)} format="currency-compact" />
      </ChartCard>

      <div className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-base font-medium text-foreground">Faturamento líquido por mês</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">{anoA}</TableHead>
              <TableHead className="text-right">{anoB}</TableHead>
              <TableHead className="text-right">Δ%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((row) => {
              const d = row.anoA ? delta(row.anoA, row.anoB ?? 0) : undefined;
              return (
                <TableRow key={row.mes}>
                  <TableCell>{row.mes}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.anoA == null ? "-" : fmtCur(row.anoA)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {row.anoB == null ? "-" : fmtCur(row.anoB)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${d ? (d.direction === "up" ? "text-positive" : "text-negative") : "text-muted-foreground"}`}
                  >
                    {d ? `${d.direction === "up" ? "▲" : "▼"} ${Math.abs(d.value).toFixed(1)}%` : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
