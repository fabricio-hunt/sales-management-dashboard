import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { DollarSign } from "lucide-react";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function RankingFinanceiroPage() {
  const mes = mesAtual();

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
    .sort((a, b) => b.venda_liq - a.venda_liq);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-emerald-400" />
          Ranking Financeiro
        </h1>
        <p className="text-slate-400 mt-1">Faturamento líquido por representante — {mes.slice(0, 7)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Meta considera só fornecedores com meta cadastrada em /admin/metas.</CardDescription>
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
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Sem dados pra este período.</TableCell></TableRow>
              )}
              {ranking.map((r, idx) => (
                <TableRow key={r.representante_id}>
                  <TableCell className="text-center font-bold text-slate-500">{idx + 1}º</TableCell>
                  <TableCell className="font-semibold">{r.nome}</TableCell>
                  <TableCell className="text-right font-mono text-slate-500">{r.meta > 0 ? fmtCur(r.meta) : "-"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtCur(r.venda_liq)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${r.pct >= 100 ? "text-emerald-600" : r.pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
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
