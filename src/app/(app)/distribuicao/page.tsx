import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { representantesEscopo } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { ChartCard } from "@/components/data-display/ChartCard";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { resolveMes, formatMes } from "@/lib/periodo";

export const revalidate = 0;

export default async function DistribuicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await requirePageAccess("distribuicao");
  const supabase = await createServerSupabase();
  const escopo = await representantesEscopo(profile);
  const { mes: mesParam } = await searchParams;
  const mes = resolveMes(mesParam);

  const [
    { data: realizado },
    { data: metas },
    { data: reps },
    { data: fornecedores },
    { data: equipes },
    { data: metasRepRows },
    { data: clientesRows },
    { data: positivacaoEquipeRows },
  ] = await Promise.all([
    supabase.from("vw_realizado_rep_fornecedor").select("*").eq("mes", mes),
    supabase.from("metas").select("representante_id, fornecedor_id, desafio_dist").eq("mes", mes),
    supabase.from("representantes").select("id, nome, equipe_id").order("id"),
    supabase.from("fornecedores").select("id, nome_fantasia").order("nome_fantasia"),
    supabase.from("equipes").select("id, cor").order("id"),
    supabase.from("metas_representante").select("representante_id, obj_positivacao, base_ativa_override").eq("mes", mes),
    supabase.from("clientes").select("representante_id, status"),
    supabase.from("vw_positivacao_equipe").select("equipe_id, clientes_ativos, positivados").eq("mes", mes),
  ]);

  // ─── Resumo por equipe (Base Ativa / Ativo / Meta / Realizado) ───
  // "Ativo" (comprou no período) e "Realizado" (positivação) já vêm deduplicados
  // por cliente da vw_positivacao_equipe — somar por representante contaria
  // duas vezes quem comprou de mais de um representante da mesma equipe. Base
  // Ativa não tem esse risco (cada cliente pertence a 1 representante só).
  const equipeIdPorRep = new Map((reps ?? []).map((r) => [r.id, r.equipe_id]));
  const clientesAtivosPorRep = new Map<string, number>();
  for (const c of clientesRows ?? []) {
    if (c.status !== "ativo") continue;
    clientesAtivosPorRep.set(c.representante_id, (clientesAtivosPorRep.get(c.representante_id) ?? 0) + 1);
  }

  const baseAtivaPorEquipe = new Map<string, number>();
  const metaPorEquipe = new Map<string, number>();
  for (const m of metasRepRows ?? []) {
    const equipeId = equipeIdPorRep.get(m.representante_id);
    if (!equipeId) continue;
    const baseAtiva = m.base_ativa_override ?? clientesAtivosPorRep.get(m.representante_id) ?? 0;
    baseAtivaPorEquipe.set(equipeId, (baseAtivaPorEquipe.get(equipeId) ?? 0) + baseAtiva);
    metaPorEquipe.set(equipeId, (metaPorEquipe.get(equipeId) ?? 0) + (m.obj_positivacao ?? 0));
  }

  const positivacaoPorEquipe = new Map((positivacaoEquipeRows ?? []).map((r) => [r.equipe_id, r]));

  // Escopo: manager vê todas as equipes; supervisor só a(s) sua(s) — derivado
  // dos representantes que ele já enxerga (mesmo mecanismo de representantesEscopo).
  const equipesVisiveis =
    escopo === "todos"
      ? (equipes ?? [])
      : (equipes ?? []).filter((eq) => (reps ?? []).some((r) => r.equipe_id === eq.id && escopo.includes(r.id)));

  const chartBaseAtiva = equipesVisiveis.map((eq) => ({ label: `Eq. ${eq.id}`, value: baseAtivaPorEquipe.get(eq.id) ?? 0, color: eq.cor }));
  const chartAtivo = equipesVisiveis.map((eq) => ({ label: `Eq. ${eq.id}`, value: positivacaoPorEquipe.get(eq.id)?.clientes_ativos ?? 0, color: eq.cor }));
  const chartMeta = equipesVisiveis.map((eq) => ({ label: `Eq. ${eq.id}`, value: metaPorEquipe.get(eq.id) ?? 0, color: eq.cor }));
  const chartRealizado = equipesVisiveis.map((eq) => ({ label: `Eq. ${eq.id}`, value: positivacaoPorEquipe.get(eq.id)?.positivados ?? 0, color: eq.cor }));

  const fornecedorNome = new Map((fornecedores ?? []).map((f) => [f.id, f.nome_fantasia]));
  const desafioMap = new Map<string, number>();
  for (const m of metas ?? []) desafioMap.set(`${m.representante_id}:${m.fornecedor_id}`, Number(m.desafio_dist));

  // pivot: linha = representante, coluna = fornecedor, valor = clientes distintos positivados
  const pivot = new Map<string, Map<number, number>>();
  for (const r of realizado ?? []) {
    if (!pivot.has(r.representante_id)) pivot.set(r.representante_id, new Map());
    pivot.get(r.representante_id)!.set(r.fornecedor_id, Number(r.distribuidos));
  }

  const fornecedoresComMeta = (fornecedores ?? []).filter((f) =>
    (metas ?? []).some((m) => m.fornecedor_id === f.id)
  );

  const totalPorFornecedor = new Map<number, number>();
  for (const f of fornecedoresComMeta) {
    let total = 0;
    for (const rep of reps ?? []) total += pivot.get(rep.id)?.get(f.id) ?? 0;
    totalPorFornecedor.set(f.id, total);
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="distribuicao"
        title="Resumo Distribuição"
        subtitle={`Base ativa, clientes ativos, meta e realizado por equipe — ${formatMes(mes)}`}
        actions={<MesFilter mes={mes} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Base Ativa por equipe" subtitle="Clientes cadastrados com status ativo (carteira)." isEmpty={chartBaseAtiva.every((c) => c.value === 0)}>
          <DistributionBarChart data={chartBaseAtiva} />
        </ChartCard>
        <ChartCard title="Clientes ativos por equipe" subtitle={`Compraram pelo menos uma vez em ${formatMes(mes)}.`} isEmpty={chartAtivo.every((c) => c.value === 0)}>
          <DistributionBarChart data={chartAtivo} />
        </ChartCard>
        <ChartCard title="Meta de positivação por equipe" subtitle="Soma do Obj. Positivação de cada representante da equipe." isEmpty={chartMeta.every((c) => c.value === 0)}>
          <DistributionBarChart data={chartMeta} />
        </ChartCard>
        <ChartCard title="Realizado por equipe" subtitle="Clientes distintos positivados no mês, sem contar duas vezes quem comprou de mais de um representante." isEmpty={chartRealizado.every((c) => c.value === 0)}>
          <DistributionBarChart data={chartRealizado} />
        </ChartCard>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Distribuição numérica por fornecedor</CardTitle>
          <CardDescription>Calculado ao vivo a partir de vendas (clientes distintos por fornecedor), não copiado de outra tela.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-2 border-b border-r text-left sticky left-0 bg-muted/40">RPA</th>
                {fornecedoresComMeta.map((f) => (
                  <th key={f.id} className="px-2 py-2 border-b border-r text-right whitespace-nowrap">{fornecedorNome.get(f.id)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reps ?? []).map((rep) => (
                <tr key={rep.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-1.5 border-r font-semibold sticky left-0 bg-card">{rep.id}</td>
                  {fornecedoresComMeta.map((f) => {
                    const real = pivot.get(rep.id)?.get(f.id) ?? 0;
                    const desafio = desafioMap.get(`${rep.id}:${f.id}`) ?? 0;
                    const abaixo = desafio > 0 && real < desafio;
                    return (
                      <td key={f.id} className={`px-2 py-1.5 border-r text-right font-mono ${abaixo ? "text-negative" : "text-foreground"}`}>
                        {real}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="px-3 py-2 border-r sticky left-0 bg-slate-900">Total</td>
                {fornecedoresComMeta.map((f) => (
                  <td key={f.id} className="px-2 py-2 border-r text-right font-mono">{totalPorFornecedor.get(f.id)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
