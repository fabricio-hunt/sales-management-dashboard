import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { representantesEscopo, aplicarEscopo } from "@/lib/auth/session";
import { EscopoVazio } from "@/components/layout/EscopoVazio";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { KpiGrid } from "@/components/data-display/KpiGrid";
import { KpiCard } from "@/components/data-display/KpiCard";
import { ChartCard } from "@/components/data-display/ChartCard";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { resolveMes } from "@/lib/periodo";

export const revalidate = 0;

type MetaRow = {
  fornecedor_id: number;
  representante_id: string;
  meta_cx: number;
  meta_dia_cx: number;
  meta_fin: number;
  preco_medio: number;
  desafio_dist: number;
  fornecedores: { nome_fantasia: string } | { nome_fantasia: string }[] | null;
};

type RealizadoRow = {
  fornecedor_id: number;
  representante_id: string;
  real_cx: number;
  real_fin: number;
  positivados: number;
  distribuidos: number;
};

function fornecedorNome(f: MetaRow["fornecedores"]): string {
  if (!f) return "";
  return Array.isArray(f) ? f[0]?.nome_fantasia ?? "" : f.nome_fantasia;
}

const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDiaCurto = (data: string) => {
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
};
const fmtNum2 = (v: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtNum0 = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ rep?: string; mes?: string }>;
}) {
  const profile = await requirePageAccess("equipe");
  const supabase = await createServerSupabase();
  const escopo = await representantesEscopo(profile);
  const { rep: repFiltro, mes: mesParam } = await searchParams;
  const mes = resolveMes(mesParam);

  const { data: periodo, error: periodoErr } = await supabase
    .from("periodos")
    .select("*")
    .eq("mes", mes)
    .maybeSingle();

  if (periodoErr || !periodo) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex justify-end">
          <MesFilter mes={mes} />
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 space-y-3">
            <h1 className="text-lg font-bold text-amber-900">Período {mes.slice(0, 7)} não configurado</h1>
            <p className="text-sm text-amber-800">
              Nenhum registro em <code>periodos</code> para este mês (ou a migration v1 ainda não foi rodada no
              Supabase). Cadastre o período em <Link href="/configuracoes" className="underline font-medium">/configuracoes</Link>{" "}
              — dias úteis, datas de início/fim e região — e garanta que <code>supabase_migration_v1.sql</code> foi
              executado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: metasRepRows } = await supabase
    .from("metas_representante")
    .select("*")
    .eq("mes", mes);

  // Escopo por papel: vendedor só enxerga o próprio representante_id, supervisor
  // só os representantes atribuídos a ele (supervisor_representantes), manager
  // sem restrição — aplicado tanto no default quanto num ?rep= forçado na URL.
  const repsEquipe = aplicarEscopo((metasRepRows ?? []).map((r) => r.representante_id), escopo);
  const repsAlvoBruto = repFiltro ? [repFiltro] : repsEquipe;
  const repsAlvo = aplicarEscopo(repsAlvoBruto, escopo);

  if (repsAlvo.length === 0) {
    return <EscopoVazio profile={profile} escopo={escopo} mes={mes} tela="A Visão Equipe" />;
  }

  const [{ data: metasRows }, { data: realizadoRows }, { data: clientesAgg }] = await Promise.all([
    supabase.from("metas").select("*, fornecedores(nome_fantasia)").eq("mes", mes).in("representante_id", repsAlvo),
    supabase.from("vw_realizado_rep_fornecedor").select("*").eq("mes", mes).in("representante_id", repsAlvo),
    supabase.from("clientes").select("representante_id, status").in("representante_id", repsAlvo),
  ]);

  const { data: faturamentoDiario } = await supabase
    .from("vw_faturamento_diario")
    .select("data_venda, venda_liq, representante_id")
    .gte("data_venda", periodo.data_inicio)
    .lte("data_venda", periodo.data_fim)
    .in("representante_id", repsAlvo);

  // ─── Dias faturado/restam: calculado ao vivo, nunca hardcoded ───
  const diasComVenda = new Set((faturamentoDiario ?? []).map((r) => r.data_venda));
  const diasFaturado = diasComVenda.size;
  const diasRestam = Math.max(0, periodo.dias_uteis - diasFaturado);
  const pctIdeal = periodo.dias_uteis > 0 ? (diasFaturado / periodo.dias_uteis) * 100 : 0;

  const receitaTotalGlobal = (faturamentoDiario ?? []).reduce((s, r) => s + Number(r.venda_liq), 0);

  const receitaPorDia = new Map<string, number>();
  for (const r of faturamentoDiario ?? []) {
    receitaPorDia.set(r.data_venda, (receitaPorDia.get(r.data_venda) ?? 0) + Number(r.venda_liq));
  }
  const chartData = [...receitaPorDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, valor]) => ({ label: fmtDiaCurto(data), value: valor }));

  // ─── Positivação/cadastro/base ativa: metas_representante + clientes (override manual disponível) ───
  const metasRepAlvo = (metasRepRows ?? []).filter((r) => repsAlvo.includes(r.representante_id));
  const objPositivacao = metasRepAlvo.reduce((s, r) => s + (r.obj_positivacao ?? 0), 0);

  const cadastroTotal = metasRepAlvo.some((r) => r.cadastro_total_override != null)
    ? metasRepAlvo.reduce((s, r) => s + (r.cadastro_total_override ?? 0), 0)
    : (clientesAgg ?? []).length;
  const baseAtiva = metasRepAlvo.some((r) => r.base_ativa_override != null)
    ? metasRepAlvo.reduce((s, r) => s + (r.base_ativa_override ?? 0), 0)
    : (clientesAgg ?? []).filter((c) => c.status === "ativo").length;

  const { data: positivacaoRows } = await supabase
    .from("vw_positivacao_representante")
    .select("*")
    .eq("mes", mes)
    .in("representante_id", repsAlvo);
  // Soma simples por representante — mesma lógica da planilha (RESUMO POSITIVAÇÃO),
  // não deduplica cliente entre representantes diferentes. Override manual (mesma
  // convenção de cadastro_total_override/base_ativa_override) tem prioridade.
  const positivadosCount = metasRepAlvo.some((r) => r.positivacao_realizado_override != null)
    ? metasRepAlvo.reduce((s, r) => s + (r.positivacao_realizado_override ?? 0), 0)
    : (positivacaoRows ?? []).reduce((s, r) => s + Number(r.positivados), 0);
  const faltaPositivar = Math.max(0, objPositivacao - positivadosCount);
  const pctPositivacaoRealizado = objPositivacao > 0 ? (positivadosCount / objPositivacao) * 100 : 0;

  // ─── Financeiro por fornecedor (só fornecedores com meta cadastrada) ───
  const metaByFornecedor = new Map<number, { nome: string; meta_cx: number; meta_dia_cx: number; meta_fin: number; desafio_dist: number; preco_medio: number }>();
  for (const m of (metasRows ?? []) as unknown as MetaRow[]) {
    const nome = fornecedorNome(m.fornecedores);
    const acc = metaByFornecedor.get(m.fornecedor_id) ?? {
      nome, meta_cx: 0, meta_dia_cx: 0, meta_fin: 0, desafio_dist: 0, preco_medio: 0,
    };
    acc.meta_cx += Number(m.meta_cx);
    acc.meta_dia_cx += Number(m.meta_dia_cx);
    acc.meta_fin += Number(m.meta_fin);
    acc.desafio_dist += Number(m.desafio_dist);
    acc.preco_medio = Number(m.preco_medio) || acc.preco_medio;
    metaByFornecedor.set(m.fornecedor_id, acc);
  }

  const realByFornecedor = new Map<number, { real_cx: number; real_fin: number; distribuidos: number }>();
  for (const r of (realizadoRows ?? []) as RealizadoRow[]) {
    const acc = realByFornecedor.get(r.fornecedor_id) ?? { real_cx: 0, real_fin: 0, distribuidos: 0 };
    acc.real_cx += Number(r.real_cx);
    acc.real_fin += Number(r.real_fin);
    // aproximação: quando >1 rep, soma pode superestimar clientes distintos
    // compartilhados entre reps — aceitável pra v1 (mesma limitação da planilha original)
    acc.distribuidos += Number(r.distribuidos);
    realByFornecedor.set(r.fornecedor_id, acc);
  }

  const receitaTotalEquipe = [...realByFornecedor.values()].reduce((s, r) => s + r.real_fin, 0);
  const projecaoFechamento = diasFaturado > 0 ? (receitaTotalGlobal / diasFaturado) * periodo.dias_uteis : 0;
  const totalMetaFin = [...metaByFornecedor.values()].reduce((s, m) => s + m.meta_fin, 0);
  const pctFinanceiroRealizado = totalMetaFin > 0 ? (receitaTotalEquipe / totalMetaFin) * 100 : 0;
  const pctProjecao = totalMetaFin > 0 ? (projecaoFechamento / totalMetaFin) * 100 : 0;
  const faltaFinanceiro = Math.max(0, totalMetaFin - receitaTotalGlobal);
  const necessidadeVendaDia = diasRestam > 0 ? faltaFinanceiro / diasRestam : 0;

  const tableData = [...metaByFornecedor.entries()]
    .map(([fornecedorId, meta]) => {
      const real = realByFornecedor.get(fornecedorId) ?? { real_cx: 0, real_fin: 0, distribuidos: 0 };
      const faltaDist = Math.max(0, meta.desafio_dist - real.distribuidos);
      const pctCx = meta.meta_cx > 0 ? (real.real_cx / meta.meta_cx) * 100 : 0;
      const pctFin = meta.meta_fin > 0 ? (real.real_fin / meta.meta_fin) * 100 : 0;
      return {
        nome: meta.nome,
        metaCx: meta.meta_cx,
        realCx: real.real_cx,
        pctCx,
        metaDiaCx: meta.meta_dia_cx,
        metaFin: meta.meta_fin,
        realFin: real.real_fin,
        pctFin,
        desafioDist: meta.desafio_dist,
        realDist: real.distribuidos,
        faltaDist,
        precoMedio: meta.preco_medio,
      };
    })
    .sort((a, b) => b.metaFin - a.metaFin);

  const totalMetaCx = tableData.reduce((s, r) => s + r.metaCx, 0);
  const totalRealCx = tableData.reduce((s, r) => s + r.realCx, 0);
  const totalRealFin = tableData.reduce((s, r) => s + r.realFin, 0);
  const totalPctCx = totalMetaCx > 0 ? (totalRealCx / totalMetaCx) * 100 : 0;
  const totalPctFin = totalMetaFin > 0 ? (totalRealFin / totalMetaFin) * 100 : 0;

  const regiaoLabel = repFiltro
    ? `${periodo.regiao ?? ""} · Rep ${repFiltro}`
    : periodo.regiao ?? "";

  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <PageHeader ajuda="equipe"
        title={regiaoLabel}
        subtitle={`Período: ${periodo.data_inicio} a ${periodo.data_fim}`}
        backHref={repFiltro ? `/equipe${mesParam ? `?mes=${mesParam}` : ""}` : undefined}
        backLabel="Voltar pra visão consolidada da equipe"
        actions={<MesFilter mes={mes} />}
      />

      {/* ─── KPIs ─── */}
      <KpiGrid>
        <KpiCard label="Dias Úteis" value={periodo.dias_uteis} />
        <KpiCard label="Dias Faturado" value={diasFaturado} />
        <KpiCard label="Dias Restam" value={diasRestam} />
        <KpiCard
          label="% Ideal"
          value={fmtPct(pctIdeal)}
          delta={{ value: pctIdeal, direction: pctIdeal >= 100 ? "up" : "down" }}
        />
      </KpiGrid>

      {/* ─── TENDÊNCIA DE FATURAMENTO ─── */}
      <ChartCard
        title="Faturamento diário da equipe"
        subtitle={`Receita líquida acumulada por dia — ${fmtCur(receitaTotalGlobal)} no mês`}
        isEmpty={chartData.length === 0}
      >
        <TrendLineChart data={chartData} format="currency-compact" />
      </ChartCard>

      {/* ─── SCORECARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="overflow-hidden border-border shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Positivação de Clientes</p>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap md:whitespace-normal">
              <tbody>
                {[
                  { label: "Cadastro Total", value: fmtNum0(cadastroTotal), color: "text-foreground", bg: "" },
                  { label: "Base Ativa", value: fmtNum0(baseAtiva), color: "text-foreground", bg: "" },
                  { label: "Obj. Positivação", value: fmtNum0(objPositivacao), color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Realizado Mês", value: fmtNum0(positivadosCount), color: "text-foreground", bg: "" },
                  { label: "Falta Positivar", value: fmtNum0(faltaPositivar), color: "text-rose-600 font-bold", bg: "bg-yellow-50" },
                  { label: "% Realizado", value: fmtPct(pctPositivacaoRealizado), color: pctPositivacaoRealizado >= pctIdeal ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                ].map(({ label, value, color, bg }) => (
                  <tr key={label} className={`border-b border-border hover:bg-muted/40 ${bg}`}>
                    <td className="px-4 py-2.5 text-muted-foreground font-medium">{label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${color}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resultado Financeiro</p>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap md:whitespace-normal">
              <tbody>
                {[
                  { label: "Obj. Financeiro", value: fmtCur(totalMetaFin), color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Vda Real. Mês", value: fmtCur(receitaTotalEquipe), color: "text-foreground", bg: "" },
                  { label: "% Realizado", value: fmtPct(pctFinanceiroRealizado), color: pctFinanceiroRealizado >= pctIdeal ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                  { label: "Projeção Fech.", value: fmtCur(projecaoFechamento), color: "text-foreground", bg: "" },
                  { label: "% Projeção Fech.", value: fmtPct(pctProjecao), color: pctProjecao >= 100 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold", bg: "" },
                  { label: "Necessidade Venda/dia", value: fmtCur(necessidadeVendaDia), color: "text-amber-700 font-bold", bg: "bg-yellow-50" },
                ].map(({ label, value, color, bg }) => (
                  <tr key={label} className={`border-b border-border hover:bg-muted/40 ${bg}`}>
                    <td className="px-4 py-2.5 text-muted-foreground font-medium">{label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${color}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ─── TABELA DE FORNECEDORES ─── */}
      <Card className="overflow-hidden border-border shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-foreground font-medium text-base">
            Objetivo em Caixas · Meta Financeira · Desafio Distribuição
          </h2>
          <span className="text-muted-foreground text-xs bg-muted px-3 py-1 rounded-full">
            {tableData.length} fornecedores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 border-b border-r bg-muted font-semibold text-muted-foreground text-center" rowSpan={2}>CM</th>
                <th className="px-3 py-2 border-b border-r bg-muted font-semibold text-muted-foreground" rowSpan={2}>Fornecedor</th>
                <th colSpan={4} className="px-3 py-1.5 border-b border-r text-center font-semibold bg-amber-50 text-amber-800 border-t">Objetivo em Caixas</th>
                <th colSpan={3} className="px-3 py-1.5 border-b border-r text-center font-semibold bg-emerald-50 text-emerald-800 border-t">Meta Financeira</th>
                <th colSpan={3} className="px-3 py-1.5 border-b text-center font-semibold bg-blue-50 text-blue-800 border-t">Desafio Distribuição Numérica</th>
              </tr>
              <tr className="bg-muted/40 text-[10px] text-muted-foreground uppercase tracking-wide">
                <th className="px-2 py-1.5 border-b border-r text-right">Volume Cx</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Venda Real.</th>
                <th className="px-2 py-1.5 border-b border-r text-right">% Real.</th>
                <th className="px-2 py-1.5 border-b border-r text-right bg-yellow-50">Meta Dia (Cx)</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Meta R$</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-2 py-1.5 border-b border-r text-right">% Real.</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Desafio</th>
                <th className="px-2 py-1.5 border-b border-r text-right">Realizado</th>
                <th className="px-2 py-1.5 border-b text-right">Falta</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    Nenhuma meta cadastrada pra este período (rode scripts/seed_metas_v1.mjs ou cadastre em /admin/metas).
                  </td>
                </tr>
              )}
              {tableData.map((row, idx) => {
                const isCxBad = row.metaCx > 0 && row.pctCx < pctIdeal;
                const isFinBad = row.metaFin > 0 && row.pctFin < pctIdeal;
                const isDistBad = row.desafioDist > 0 && row.realDist < row.desafioDist * (pctIdeal / 100);

                return (
                  <tr key={row.nome} className={`border-b border-border transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"} hover:bg-accent/40`}>
                    <td className="px-2 py-2 border-r text-center text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 border-r font-semibold text-foreground whitespace-nowrap max-w-[150px] truncate">{row.nome}</td>
                    <td className="px-2 py-2 border-r text-right font-mono text-muted-foreground">{fmtNum2(row.metaCx || 0)}</td>
                    <td className="px-2 py-2 border-r text-right font-mono font-semibold text-foreground">{fmtNum2(row.realCx)}</td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-bold ${row.metaCx > 0 ? (isCxBad ? "text-negative bg-rose-50" : "text-positive") : "text-muted-foreground"}`}>
                      {row.metaCx > 0 ? fmtPct(row.pctCx) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono bg-amber-50 text-amber-800 font-bold">
                      {row.metaDiaCx > 0 ? fmtNum2(row.metaDiaCx) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono text-muted-foreground">{row.metaFin > 0 ? fmtCur(row.metaFin) : "-"}</td>
                    <td className="px-2 py-2 border-r text-right font-mono font-semibold text-foreground">{fmtCur(row.realFin)}</td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-bold ${row.metaFin > 0 ? (isFinBad ? "text-negative bg-rose-50" : "text-positive") : "text-muted-foreground"}`}>
                      {row.metaFin > 0 ? fmtPct(row.pctFin) : "-"}
                    </td>
                    <td className="px-2 py-2 border-r text-right font-mono text-muted-foreground">{row.desafioDist > 0 ? fmtNum0(row.desafioDist) : "-"}</td>
                    <td className={`px-2 py-2 border-r text-right font-mono font-semibold ${isDistBad ? "text-negative" : "text-foreground"}`}>{fmtNum0(row.realDist)}</td>
                    <td className={`px-2 py-2 text-right font-mono font-bold ${row.faltaDist > 0 ? "text-negative" : "text-positive"}`}>
                      {row.desafioDist > 0 ? (row.faltaDist > 0 ? fmtNum0(row.faltaDist) : "✓") : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-600">
                <td colSpan={2} className="px-3 py-3 text-xs uppercase tracking-wider">TOTAL</td>
                <td className="px-2 py-3 text-right font-mono">{fmtNum2(totalMetaCx)}</td>
                <td className="px-2 py-3 text-right font-mono">{fmtNum2(totalRealCx)}</td>
                <td className={`px-2 py-3 text-right font-mono ${totalPctCx >= pctIdeal ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalMetaCx > 0 ? fmtPct(totalPctCx) : "-"}
                </td>
                <td className="px-2 py-3" />
                <td className="px-2 py-3 text-right font-mono text-amber-300">{fmtCur(totalMetaFin)}</td>
                <td className="px-2 py-3 text-right font-mono text-emerald-300">{fmtCur(totalRealFin)}</td>
                <td className={`px-2 py-3 text-right font-mono ${totalPctFin >= pctIdeal ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(totalPctFin)}</td>
                <td colSpan={3} className="px-2 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {!repFiltro && (
        <div className="flex flex-wrap gap-2">
          {repsEquipe.map((repId) => (
            <Link
              key={repId}
              href={`/equipe?rep=${repId}${mesParam ? `&mes=${mesParam}` : ""}`}
              className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Ver RPA {repId}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
