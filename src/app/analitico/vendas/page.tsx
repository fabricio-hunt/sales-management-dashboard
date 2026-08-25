import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

const PAGE_SIZE = 100;

function mesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function AnaliticoVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; rep?: string }>;
}) {
  const { page: pageParam, rep: repFiltro } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const mes = mesAtual();

  const [{ data: periodo }, { data: representantes }] = await Promise.all([
    supabase.from("periodos").select("*").eq("mes", mes).maybeSingle(),
    supabase.from("representantes").select("id, nome").order("id"),
  ]);

  let query = supabase
    .from("vendas")
    .select("data_venda, pedido_nr, venda_liq, qtde, representante_id, cliente_id, produto_id, clientes(razao_social), produtos(descricao)", { count: "exact" })
    .order("data_venda", { ascending: false });

  if (periodo) query = query.gte("data_venda", periodo.data_inicio).lte("data_venda", periodo.data_fim);
  if (repFiltro) query = query.eq("representante_id", repFiltro);

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count } = await query.range(from, from + PAGE_SIZE - 1);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const buildHref = (p: number) => `/analitico/vendas?page=${p}${repFiltro ? `&rep=${repFiltro}` : ""}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-cyan-400" />
          Analítico de Vendas
        </h1>
        <p className="text-slate-400 mt-1">Extrato detalhado por nota — {mes.slice(0, 7)} — {count ?? 0} registro(s)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/analitico/vendas?page=1" className={`text-xs px-3 py-1.5 rounded-full ${!repFiltro ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
          Todos
        </Link>
        {(representantes ?? []).map((r) => (
          <Link
            key={r.id}
            href={`/analitico/vendas?page=1&rep=${r.id}`}
            className={`text-xs px-3 py-1.5 rounded-full ${repFiltro === r.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {r.id}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extrato</CardTitle>
          <CardDescription>Página {page} de {totalPages}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Venda Líq.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!rows || rows.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma venda encontrada.</TableCell></TableRow>
                )}
                {rows?.map((v, idx) => {
                  const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
                  const produto = Array.isArray(v.produtos) ? v.produtos[0] : v.produtos;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{v.data_venda}</TableCell>
                      <TableCell className="font-mono text-xs">{v.pedido_nr}</TableCell>
                      <TableCell className="text-xs">{v.representante_id}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{cliente?.razao_social ?? v.cliente_id}</TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate">{produto?.descricao ?? v.produto_id}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(v.qtde).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{fmtCur(Number(v.venda_liq))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4 text-sm">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              className={`px-3 py-1.5 rounded-md border ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
            >
              &larr; Anterior
            </Link>
            <span className="text-slate-500">Página {page} de {totalPages}</span>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              className={`px-3 py-1.5 rounded-md border ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
            >
              Próxima &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
