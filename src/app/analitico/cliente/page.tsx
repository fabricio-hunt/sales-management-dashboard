import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { PieChart } from "lucide-react";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function AnaliticoClientePage() {
  const mes = mesAtual();
  const { data: periodo } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle();

  const { data: rows } = periodo
    ? await supabase
        .from("vw_vendas_cliente_dia")
        .select("cliente_id, data_venda, venda_liq, devolucao, qtde")
        .gte("data_venda", periodo.data_inicio)
        .lte("data_venda", periodo.data_fim)
    : { data: [] as { cliente_id: string; data_venda: string; venda_liq: number; devolucao: number; qtde: number }[] };

  const { data: clientes } = await supabase.from("clientes").select("id, razao_social, fantasia");
  const nomeCliente = new Map((clientes ?? []).map((c) => [c.id, c.fantasia || c.razao_social || c.id]));

  const porCliente = new Map<string, { venda_liq: number; devolucao: number; qtde: number; dias: Set<string> }>();
  for (const r of rows ?? []) {
    const acc = porCliente.get(r.cliente_id) ?? { venda_liq: 0, devolucao: 0, qtde: 0, dias: new Set() };
    acc.venda_liq += Number(r.venda_liq);
    acc.devolucao += Number(r.devolucao);
    acc.qtde += Number(r.qtde);
    acc.dias.add(r.data_venda);
    porCliente.set(r.cliente_id, acc);
  }

  const ranking = [...porCliente.entries()]
    .map(([id, v]) => ({ id, nome: nomeCliente.get(id) ?? id, ...v, dias: v.dias.size }))
    .sort((a, b) => b.venda_liq - a.venda_liq)
    .slice(0, 200);

  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <PieChart className="w-7 h-7 text-pink-400" />
          Analítico Cliente
        </h1>
        <p className="text-slate-400 mt-1">Venda e devolução por cliente — {mes.slice(0, 7)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 200 clientes por faturamento</CardTitle>
          <CardDescription>{ranking.length} cliente(s) com movimentação no período.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Dias com compra</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Devolução</TableHead>
                  <TableHead className="text-right">Venda Líquida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Sem dados pra este período.</TableCell></TableRow>
                )}
                {ranking.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right font-mono">{c.dias}</TableCell>
                    <TableCell className="text-right font-mono">{c.qtde.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-rose-600">{c.devolucao > 0 ? fmtCur(c.devolucao) : "-"}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtCur(c.venda_liq)}</TableCell>
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
