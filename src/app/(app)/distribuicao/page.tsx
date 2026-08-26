import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/PageHeader";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function DistribuicaoPage() {
  await requirePageAccess("distribuicao");
  const supabase = await createServerSupabase();
  const mes = mesAtual();

  const [{ data: realizado }, { data: metas }, { data: reps }, { data: fornecedores }] = await Promise.all([
    supabase.from("vw_realizado_rep_fornecedor").select("*").eq("mes", mes),
    supabase.from("metas").select("representante_id, fornecedor_id, desafio_dist").eq("mes", mes),
    supabase.from("representantes").select("id, nome").order("id"),
    supabase.from("fornecedores").select("id, nome_fantasia").order("nome_fantasia"),
  ]);

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
      <PageHeader
        title="Resumo Distribuição"
        subtitle={`Clientes distintos positivados por representante × fornecedor — ${mes.slice(0, 7)}`}
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Distribuição numérica</CardTitle>
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
