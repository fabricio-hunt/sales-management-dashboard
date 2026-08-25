import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Trophy } from "lucide-react";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function RankingPositivacaoPage() {
  const mes = mesAtual();

  const [{ data: positivacao }, { data: metasRep }, { data: reps }] = await Promise.all([
    supabase.from("vw_positivacao_representante").select("*").eq("mes", mes),
    supabase.from("metas_representante").select("*").eq("mes", mes),
    supabase.from("representantes").select("id, nome"),
  ]);

  const repNome = new Map((reps ?? []).map((r) => [r.id, r.nome]));
  const objByRep = new Map((metasRep ?? []).map((m) => [m.representante_id, m.obj_positivacao]));

  const ranking = (positivacao ?? [])
    .map((p) => {
      const obj = objByRep.get(p.representante_id) ?? 0;
      const pct = obj > 0 ? (Number(p.positivados) / obj) * 100 : 0;
      return {
        representante_id: p.representante_id,
        nome: repNome.get(p.representante_id) ?? p.representante_id,
        positivados: Number(p.positivados),
        obj,
        pct,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Trophy className="w-7 h-7 text-amber-400" />
          Ranking de Positivação
        </h1>
        <p className="text-slate-400 mt-1">% de atingimento do objetivo de positivação por representante — {mes.slice(0, 7)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Calculado ao vivo a partir de vendas (is_positivacao=1), nunca copiado de outra tela.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Pos.</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Objetivo</TableHead>
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
                  <TableCell className="text-right font-mono">{r.obj}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{r.positivados}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${r.pct >= 100 ? "text-emerald-600" : r.pct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                    {fmtPct(r.pct)}
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
