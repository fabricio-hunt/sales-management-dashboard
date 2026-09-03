import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { representantesEscopo, aplicarEscopo } from "@/lib/auth/session";
import { calcularComissao, type ComissaoFaixa } from "@/lib/comissao/calcular";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { Alert } from "@/components/ui/alert";
import { EscopoVazio } from "@/components/layout/EscopoVazio";
import { resolveMes } from "@/lib/periodo";

export const revalidate = 0;

type MetaRow = {
  representante_id: string;
  fornecedor_id: number;
  meta_cx: number;
  meta_fin: number;
  premiacao_pct_cx: number;
  premiacao_pct_fin: number;
  fornecedores: { nome_fantasia: string } | { nome_fantasia: string }[] | null;
};

function fornecedorNome(f: MetaRow["fornecedores"]): string {
  if (!f) return "";
  return Array.isArray(f) ? f[0]?.nome_fantasia ?? "" : f.nome_fantasia;
}

// Faixas específicas do fornecedor têm prioridade; sem nenhuma, cai pras
// faixas globais (fornecedor_id NULL) — mesma convenção de override do resto
// do sistema (específico > geral).
function faixasParaFornecedor(fornecedorId: number, todas: (ComissaoFaixa & { fornecedor_id: number | null })[]) {
  const especificas = todas.filter((f) => f.fornecedor_id === fornecedorId);
  return especificas.length > 0 ? especificas : todas.filter((f) => f.fornecedor_id === null);
}

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const profile = await requirePageAccess("comissoes");
  const supabase = await createServerSupabase();
  const escopo = await representantesEscopo(profile);
  const { mes: mesParam } = await searchParams;
  const mes = resolveMes(mesParam);

  const { data: metasRepRows } = await supabase.from("metas_representante").select("representante_id").eq("mes", mes);
  const repsAlvo = aplicarEscopo((metasRepRows ?? []).map((r) => r.representante_id), escopo);

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  if (repsAlvo.length === 0) {
    return <EscopoVazio profile={profile} escopo={escopo} mes={mes} tela="A tela de Comissão/Premiação" />;
  }

  const [{ data: metasRows }, { data: realizadoRows }, { data: faixasRows }, { data: reps }] = await Promise.all([
    supabase.from("metas").select("*, fornecedores(nome_fantasia)").eq("mes", mes).in("representante_id", repsAlvo),
    supabase.from("vw_realizado_rep_fornecedor").select("*").eq("mes", mes).in("representante_id", repsAlvo),
    supabase.from("comissao_faixas").select("*").eq("ativo", true).order("ordem"),
    supabase.from("representantes").select("id, nome"),
  ]);

  const repNome = new Map((reps ?? []).map((r) => [r.id, r.nome]));
  const faixas = (faixasRows ?? []) as (ComissaoFaixa & { fornecedor_id: number | null })[];

  const realByKey = new Map<string, { real_cx: number; real_fin: number }>();
  for (const r of realizadoRows ?? []) {
    realByKey.set(`${r.representante_id}:${r.fornecedor_id}`, { real_cx: Number(r.real_cx), real_fin: Number(r.real_fin) });
  }

  const linhas = ((metasRows ?? []) as unknown as (MetaRow & { representante_id: string })[]).map((m) => {
    const real = realByKey.get(`${m.representante_id}:${m.fornecedor_id}`) ?? { real_cx: 0, real_fin: 0 };
    const pctFin = m.meta_fin > 0 ? (real.real_fin / m.meta_fin) * 100 : 0;
    const pctCx = m.meta_cx > 0 ? (real.real_cx / m.meta_cx) * 100 : 0;
    const faixasFornecedor = faixasParaFornecedor(m.fornecedor_id, faixas);

    const comissaoFin = calcularComissao({ baseRealizado: real.real_fin, premiacaoPct: Number(m.premiacao_pct_fin), pctAtingimento: pctFin, faixas: faixasFornecedor });
    const comissaoCx = calcularComissao({ baseRealizado: real.real_cx, premiacaoPct: Number(m.premiacao_pct_cx), pctAtingimento: pctCx, faixas: faixasFornecedor });

    return {
      representante: repNome.get(m.representante_id) ?? m.representante_id,
      fornecedor: fornecedorNome(m.fornecedores),
      pctFin,
      pctCx,
      comissaoFin,
      comissaoCx,
      total: comissaoFin + comissaoCx,
    };
  });

  const totalGeral = linhas.reduce((s, l) => s + l.total, 0);

  // Sem % de premiação cadastrado a fórmula inteira multiplica por zero e a tela
  // mostra R$ 0,00 sem explicar nada — o usuário conclui que o sistema não calcula.
  const semPercentual =
    linhas.length > 0 &&
    ((metasRows ?? []) as unknown as MetaRow[]).every(
      (m) => Number(m.premiacao_pct_cx) === 0 && Number(m.premiacao_pct_fin) === 0
    );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="comissoes"
        title="Comissão/Premiação"
        subtitle={`Estimativa calculada ao vivo a partir das faixas de atingimento — ${mes.slice(0, 7)}`}
        actions={<MesFilter mes={mes} />}
      />

      <Alert variant="aviso" titulo="Valores em validação — não use para pagamento ainda">
        <p>
          As <strong>faixas de atingimento</strong> usadas aqui (90% / 100% e seus fatores) são um rascunho
          tirado da planilha original e <strong>ainda não foram confirmadas</strong>. O Manager ajusta em{" "}
          <code>Faixas de Comissão</code>.
        </p>
        <p className="mt-1">
          Esta tela também ainda <strong>não separa CLT de PJ</strong> nem calcula o{" "}
          <strong>Prêmio de Positivação</strong> — os dois dependem de regras que ainda estão sendo
          confirmadas. Hoje ela cobre o Prêmio por Caixa (por fornecedor) e o Prêmio Financeiro.
        </p>
      </Alert>

      {semPercentual && (
        <Alert variant="bloqueio" titulo="Os percentuais de premiação estão zerados">
          <p>
            Todas as metas deste mês estão com <code>% Caixas</code> e <code>% Financeiro</code> em zero, então
            toda comissão sai R$ 0,00. Preencha em <code>Metas por Fornecedor</code> (ou importe a planilha de
            metas) antes de conferir os valores.
          </p>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhe por representante × fornecedor</CardTitle>
          <CardDescription>
            Fórmula: realizado × % de premiação (/admin/metas) × fator da faixa de atingimento (/admin/comissoes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Representante</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">% Fin.</TableHead>
                <TableHead className="text-right">Comissão Fin.</TableHead>
                <TableHead className="text-right">% Caixas</TableHead>
                <TableHead className="text-right">Comissão Caixas</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem metas cadastradas pra este período.</TableCell></TableRow>
              )}
              {linhas.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold">{l.representante}</TableCell>
                  <TableCell>{l.fornecedor}</TableCell>
                  <TableCell className="text-right font-mono">{fmtPct(l.pctFin)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCur(l.comissaoFin)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtPct(l.pctCx)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCur(l.comissaoCx)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-positive">{fmtCur(l.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {linhas.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-border mt-2">
              <span className="text-sm font-semibold text-foreground">Total geral: {fmtCur(totalGeral)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
