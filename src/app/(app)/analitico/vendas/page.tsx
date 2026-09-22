import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createServerSupabase } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/permissions";
import { representantesEscopo } from "@/lib/auth/session";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesFilter } from "@/components/layout/MesFilter";
import { resolveMes, formatMes } from "@/lib/periodo";

export const revalidate = 0;

const PAGE_SIZE = 100;

export default async function AnaliticoVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; equipe?: string; rep?: string; mes?: string }>;
}) {
  const profile = await requirePageAccess("analitico.vendas");
  const supabase = await createServerSupabase();
  const escopo = await representantesEscopo(profile);
  const { page: pageParam, equipe: equipeFiltro, rep: repFiltro, mes: mesParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const mes = resolveMes(mesParam);

  const [{ data: periodo }, { data: representantes }, { data: equipes }] = await Promise.all([
    supabase.from("periodos").select("*").eq("mes", mes).maybeSingle(),
    supabase.from("representantes").select("id, nome, equipe_id").order("id"),
    supabase.from("equipes").select("id, cor").order("id"),
  ]);

  // Manager vê todas as equipes; supervisor só a(s) sua(s) — mesmo mecanismo de /distribuicao.
  const equipesVisiveis =
    escopo === "todos"
      ? (equipes ?? [])
      : (equipes ?? []).filter((eq) => (representantes ?? []).some((r) => r.equipe_id === eq.id && escopo.includes(r.id)));

  const repsDaEquipe = equipeFiltro
    ? (representantes ?? []).filter((r) => r.equipe_id === equipeFiltro && (escopo === "todos" || escopo.includes(r.id)))
    : [];

  const equipeIdPorRep = new Map((representantes ?? []).map((r) => [r.id, r.equipe_id]));
  const corPorEquipe = new Map((equipes ?? []).map((eq) => [eq.id, eq.cor]));

  let query = supabase
    .from("vendas")
    .select("data_venda, pedido_nr, venda_liq, qtde, representante_id, cliente_id, produto_id, clientes(razao_social), produtos(descricao)", { count: "exact" })
    .order("data_venda", { ascending: false });

  if (periodo) query = query.gte("data_venda", periodo.data_inicio).lte("data_venda", periodo.data_fim);
  if (repFiltro) {
    query = query.eq("representante_id", repFiltro);
  } else if (equipeFiltro) {
    const idsDaEquipe = (representantes ?? []).filter((r) => r.equipe_id === equipeFiltro).map((r) => r.id);
    query = query.in("representante_id", idsDaEquipe.length > 0 ? idsDaEquipe : ["__nenhum__"]);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count } = await query.range(from, from + PAGE_SIZE - 1);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const mesQuery = mesParam ? `&mes=${mesParam}` : "";
  const buildHref = (p: number) =>
    `/analitico/vendas?page=${p}${equipeFiltro ? `&equipe=${equipeFiltro}` : ""}${repFiltro ? `&rep=${repFiltro}` : ""}${mesQuery}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="analitico.vendas"
        title="Analítico de Vendas"
        subtitle={`Extrato detalhado por nota — ${formatMes(mes)} — ${count ?? 0} registro(s)`}
        actions={<MesFilter mes={mes} />}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/analitico/vendas?page=1${mesQuery}`}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${!equipeFiltro && !repFiltro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
          >
            Todas as equipes
          </Link>
          {equipesVisiveis.map((eq) => (
            <Link
              key={eq.id}
              href={`/analitico/vendas?page=1&equipe=${eq.id}${mesQuery}`}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${equipeFiltro === eq.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: eq.cor }} />
              Equipe {eq.id}
            </Link>
          ))}
        </div>

        {equipeFiltro && repsDaEquipe.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-3 border-l-2" style={{ borderColor: corPorEquipe.get(equipeFiltro) }}>
            <Link
              href={`/analitico/vendas?page=1&equipe=${equipeFiltro}${mesQuery}`}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!repFiltro ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              Toda a equipe
            </Link>
            {repsDaEquipe.map((r) => (
              <Link
                key={r.id}
                href={`/analitico/vendas?page=1&equipe=${equipeFiltro}&rep=${r.id}${mesQuery}`}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${repFiltro === r.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                {r.id} — {r.nome}
              </Link>
            ))}
          </div>
        )}
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
                  <TableHead>Equipe</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Venda Líq.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!rows || rows.length === 0) && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada.</TableCell></TableRow>
                )}
                {rows?.map((v, idx) => {
                  const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
                  const produto = Array.isArray(v.produtos) ? v.produtos[0] : v.produtos;
                  const equipeId = equipeIdPorRep.get(v.representante_id);
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{v.data_venda}</TableCell>
                      <TableCell className="font-mono text-xs">{v.pedido_nr}</TableCell>
                      <TableCell className="text-xs">
                        {equipeId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: corPorEquipe.get(equipeId) }} />
                            {equipeId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
              className={`px-3 py-1.5 rounded-md border border-border ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
            >
              &larr; Anterior
            </Link>
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              className={`px-3 py-1.5 rounded-md border border-border ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
            >
              Próxima &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
