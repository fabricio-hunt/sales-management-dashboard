import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiGrid } from "@/components/data-display/KpiGrid";
import { KpiCard } from "@/components/data-display/KpiCard";
import { ChartCard } from "@/components/data-display/ChartCard";
import { DistributionDonut } from "@/components/charts/DistributionDonut";
import { tokens } from "@/lib/design-tokens";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const classeCor: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-muted text-muted-foreground",
};

const classeChartColor: Record<string, string> = {
  A: tokens.colors.positive,
  B: "#F59E0B",
  C: tokens.colors.neutral,
};

export default async function ProdutosPage() {
  await requirePageAccess("produtos");
  const supabase = await createServerSupabase();
  const mes = mesAtual();
  const { data: periodo } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle();

  const [{ data: vendas }, { data: produtos }, { data: fornecedores }] = await Promise.all([
    periodo
      ? supabase.from("vendas").select("produto_id, venda_liq, qtde").gte("data_venda", periodo.data_inicio).lte("data_venda", periodo.data_fim)
      : Promise.resolve({ data: [] as { produto_id: string; venda_liq: number; qtde: number }[] }),
    supabase.from("produtos").select("id, descricao, fornecedor_id"),
    supabase.from("fornecedores").select("id, nome_fantasia"),
  ]);

  const descricaoById = new Map((produtos ?? []).map((p) => [p.id, p]));
  const fornecedorNome = new Map((fornecedores ?? []).map((f) => [f.id, f.nome_fantasia]));

  const porProduto = new Map<string, { venda_liq: number; qtde: number }>();
  for (const v of vendas ?? []) {
    const acc = porProduto.get(v.produto_id) ?? { venda_liq: 0, qtde: 0 };
    acc.venda_liq += Number(v.venda_liq);
    acc.qtde += Number(v.qtde);
    porProduto.set(v.produto_id, acc);
  }

  const totalGeral = [...porProduto.values()].reduce((s, p) => s + p.venda_liq, 0);

  const ranked = [...porProduto.entries()]
    .map(([id, v]) => {
      const prod = descricaoById.get(id);
      return {
        id,
        descricao: prod?.descricao ?? id,
        fornecedor: prod?.fornecedor_id != null ? fornecedorNome.get(prod.fornecedor_id) ?? "-" : "-",
        venda_liq: v.venda_liq,
        qtde: v.qtde,
      };
    })
    .sort((a, b) => b.venda_liq - a.venda_liq);

  const comClasse = ranked.reduce<{ items: (typeof ranked[number] & { pctAcumulado: number; classe: string })[]; acumulado: number }>(
    (acc, p) => {
      const acumulado = acc.acumulado + p.venda_liq;
      const pctAcumulado = totalGeral > 0 ? (acumulado / totalGeral) * 100 : 0;
      const classe = pctAcumulado <= 80 ? "A" : pctAcumulado <= 95 ? "B" : "C";
      acc.items.push({ ...p, pctAcumulado, classe });
      acc.acumulado = acumulado;
      return acc;
    },
    { items: [], acumulado: 0 }
  ).items;

  const contagem = { A: 0, B: 0, C: 0 };
  const valorPorClasse = { A: 0, B: 0, C: 0 };
  for (const p of comClasse) {
    contagem[p.classe as "A" | "B" | "C"] += 1;
    valorPorClasse[p.classe as "A" | "B" | "C"] += p.venda_liq;
  }

  const donutData = (["A", "B", "C"] as const)
    .filter((c) => valorPorClasse[c] > 0)
    .map((c) => ({ label: `Classe ${c}`, value: valorPorClasse[c], color: classeChartColor[c] }));

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Curva ABC de Produtos"
        subtitle={`Classificação por relevância de faturamento — não existe na planilha original, adicionado como boa prática de gestão comercial pra distribuidoras. ${mes.slice(0, 7)}`}
      />

      <KpiGrid>
        <KpiCard label="Produtos Classe A" value={contagem.A} hint={fmtCur(valorPorClasse.A)} />
        <KpiCard label="Produtos Classe B" value={contagem.B} hint={fmtCur(valorPorClasse.B)} />
        <KpiCard label="Produtos Classe C" value={contagem.C} hint={fmtCur(valorPorClasse.C)} />
        <KpiCard label="Faturamento Total" value={fmtCur(totalGeral)} />
      </KpiGrid>

      <ChartCard
        title="Distribuição por classe"
        subtitle="Participação de cada classe no faturamento do período."
        isEmpty={donutData.length === 0}
      >
        <DistributionDonut data={donutData} format="currency-compact" />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Ranking por faturamento</CardTitle>
          <CardDescription>Classe A = até 80% do faturamento acumulado · B = até 95% · C = restante.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-14">Classe</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Venda Líq.</TableHead>
                  <TableHead className="text-right">% Acum.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comClasse.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem vendas no período.</TableCell></TableRow>
                )}
                {comClasse.slice(0, 300).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${classeCor[p.classe]}`}>{p.classe}</span>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{p.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">{p.fornecedor}</TableCell>
                    <TableCell className="text-right font-mono">{p.qtde.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtCur(p.venda_liq)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{p.pctAcumulado.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
