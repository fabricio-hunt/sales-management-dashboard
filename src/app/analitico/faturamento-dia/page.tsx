import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { TrendingUp } from "lucide-react";

export const revalidate = 0;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function FaturamentoDiaPage() {
  const mes = mesAtual();
  const { data: periodo } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle();

  const { data: rows } = periodo
    ? await supabase
        .from("vw_faturamento_diario")
        .select("data_venda, venda_liq, venda_bruta, devolucao, clientes_atendidos")
        .gte("data_venda", periodo.data_inicio)
        .lte("data_venda", periodo.data_fim)
    : { data: [] as { data_venda: string; venda_liq: number; venda_bruta: number; devolucao: number; clientes_atendidos: number }[] };

  const porDia = new Map<string, { venda_liq: number; venda_bruta: number; devolucao: number; clientes: Set<number> }>();
  for (const r of rows ?? []) {
    const acc = porDia.get(r.data_venda) ?? { venda_liq: 0, venda_bruta: 0, devolucao: 0, clientes: new Set() };
    acc.venda_liq += Number(r.venda_liq);
    acc.venda_bruta += Number(r.venda_bruta);
    acc.devolucao += Number(r.devolucao);
    porDia.set(r.data_venda, acc);
  }

  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b));
  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const maxVenda = Math.max(1, ...dias.map(([, v]) => v.venda_liq));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-violet-400" />
          Faturamento Diário
        </h1>
        <p className="text-slate-400 mt-1">Venda líquida por dia — {mes.slice(0, 7)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução no mês</CardTitle>
          <CardDescription>{dias.length} dia(s) com venda registrada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {dias.length === 0 && <p className="text-center py-8 text-slate-400">Sem vendas no período.</p>}
          {dias.map(([data, v]) => (
            <div key={data} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-slate-500 font-mono shrink-0">{data}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-blue-500 rounded" style={{ width: `${(v.venda_liq / maxVenda) * 100}%` }} />
              </div>
              <span className="w-32 text-right font-mono font-semibold shrink-0">{fmtCur(v.venda_liq)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
