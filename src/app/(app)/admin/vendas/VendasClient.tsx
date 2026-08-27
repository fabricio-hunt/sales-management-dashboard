"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { lancarVenda, excluirVendaManual } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Save, ShoppingCart } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

type Role = "manager" | "supervisor" | "vendedor"
type Representante = { id: string; nome: string }
type Cliente = { id: string; razao_social: string | null; fantasia: string | null; representante_id: string | null }
type Produto = { id: string; descricao: string | null }
type LancamentoRow = {
  pedido_nr: string
  data_venda: string
  cliente_id: string
  representante_id: string
  produto_id: string
  qtde: number
  venda_liq: number
  created_at: string
}
type ItemRascunho = { produto_id: string; descricao: string; qtde: number; preco_unitario: number; desconto: number }

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

export default function VendasClient({
  profile,
  representantes,
  clientes,
  produtos,
  lancamentosIniciais,
}: {
  profile: { id: string; nome: string; role: Role; representante_id: string | null }
  representantes: Representante[]
  clientes: Cliente[]
  produtos: Produto[]
  lancamentosIniciais: LancamentoRow[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const podeEscolherRepresentante = profile.role !== "vendedor"

  const [representanteId, setRepresenteId] = useState(profile.representante_id ?? representantes[0]?.id ?? "")
  const [clienteId, setClienteId] = useState("")
  const [dataVenda, setDataVenda] = useState(hoje())
  const [itens, setItens] = useState<ItemRascunho[]>([])
  const [salvando, setSalvando] = useState(false)
  const [lancamentos, setLancamentos] = useState(lancamentosIniciais)

  const [produtoTexto, setProdutoTexto] = useState("")
  const [qtdeItem, setQtdeItem] = useState<string>("1")
  const [precoItem, setPrecoItem] = useState<string>("")
  const [descontoItem, setDescontoItem] = useState<string>("0")
  const [buscandoPreco, setBuscandoPreco] = useState(false)

  const produtoLabel = (p: Produto) => `${p.descricao ?? p.id} — ${p.id}`
  const produtoSelecionado = produtos.find((p) => produtoLabel(p) === produtoTexto) ?? null

  const clientesDoRepresentante = clientes.filter((c) => c.representante_id === representanteId)

  const handleProdutoChange = async (valor: string) => {
    setProdutoTexto(valor)
    const produto = produtos.find((p) => produtoLabel(p) === valor)
    if (!produto) return

    setBuscandoPreco(true)
    try {
      const { data } = await supabase
        .from("vendas")
        .select("venda_liq, qtde")
        .eq("produto_id", produto.id)
        .order("data_venda", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data && Number(data.qtde) > 0) {
        setPrecoItem((Number(data.venda_liq) / Number(data.qtde)).toFixed(2))
      }
    } finally {
      setBuscandoPreco(false)
    }
  }

  const adicionarItem = () => {
    if (!produtoSelecionado) {
      toast.error("Selecione um produto válido da lista.")
      return
    }
    const qtde = Number(qtdeItem)
    const preco = Number(precoItem)
    if (!qtde || qtde <= 0) { toast.error("Quantidade inválida."); return }
    if (!preco || preco <= 0) { toast.error("Preço unitário inválido."); return }

    setItens((prev) => [
      ...prev,
      { produto_id: produtoSelecionado.id, descricao: produtoSelecionado.descricao ?? produtoSelecionado.id, qtde, preco_unitario: preco, desconto: Number(descontoItem) || 0 },
    ])
    setProdutoTexto("")
    setQtdeItem("1")
    setPrecoItem("")
    setDescontoItem("0")
  }

  const removerItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx))

  const totais = itens.reduce(
    (acc, it) => {
      const bruta = it.qtde * it.preco_unitario
      acc.bruta += bruta
      acc.desconto += it.desconto
      acc.liq += bruta - it.desconto
      return acc
    },
    { bruta: 0, desconto: 0, liq: 0 }
  )

  const salvar = async () => {
    if (!clienteId) { toast.error("Selecione o cliente."); return }
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return }

    setSalvando(true)
    try {
      const resultado = await lancarVenda({
        representante_id: representanteId,
        cliente_id: clienteId,
        data_venda: dataVenda,
        itens: itens.map(({ produto_id, qtde, preco_unitario, desconto }) => ({ produto_id, qtde, preco_unitario, desconto })),
      })
      toast.success(`Venda lançada! Pedido ${resultado.pedido_nr}.`)
      setLancamentos((prev) => [
        ...itens.map((it) => ({
          pedido_nr: resultado.pedido_nr,
          data_venda: dataVenda,
          cliente_id: clienteId,
          representante_id: representanteId,
          produto_id: it.produto_id,
          qtde: it.qtde,
          venda_liq: it.qtde * it.preco_unitario - it.desconto,
          created_at: new Date().toISOString(),
        })),
        ...prev,
      ])
      setItens([])
      setClienteId("")
      router.refresh()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (pedidoNr: string) => {
    if (!window.confirm(`Excluir o lançamento ${pedidoNr}? Isso remove todos os itens dele.`)) return
    try {
      await excluirVendaManual(pedidoNr)
      toast.success("Lançamento excluído.")
      setLancamentos((prev) => prev.filter((l) => l.pedido_nr !== pedidoNr))
      router.refresh()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const nomeCliente = (id: string) => {
    const c = clientes.find((c) => c.id === id)
    return c?.fantasia || c?.razao_social || id
  }
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.descricao ?? id

  const pedidosAgrupados = useMemo(() => {
    const map = new Map<string, { pedido_nr: string; data_venda: string; cliente_id: string; representante_id: string; total: number; itens: number }>()
    for (const l of lancamentos) {
      const acc = map.get(l.pedido_nr) ?? { pedido_nr: l.pedido_nr, data_venda: l.data_venda, cliente_id: l.cliente_id, representante_id: l.representante_id, total: 0, itens: 0 }
      acc.total += Number(l.venda_liq)
      acc.itens += 1
      map.set(l.pedido_nr, acc)
    }
    return [...map.values()].sort((a, b) => b.pedido_nr.localeCompare(a.pedido_nr))
  }, [lancamentos])

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="admin.vendas"
        title="Lançamento de Vendas"
        subtitle="Cadastre vendas avulsas manualmente — entram direto no cálculo de positivação, financeiro e comissão, sem depender do import mensal."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo lançamento</CardTitle>
          <CardDescription>Entra como positivação automaticamente. Não é apagado pelo próximo import do ERP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            {podeEscolherRepresentante && (
              <div className="space-y-1.5">
                <Label>Representante</Label>
                <select
                  value={representanteId}
                  onChange={(e) => { setRepresenteId(e.target.value); setClienteId("") }}
                  className="h-9 w-52 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                >
                  {representantes.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="">Selecione...</option>
                {clientesDoRepresentante.map((c) => (
                  <option key={c.id} value={c.id}>{c.fantasia || c.razao_social || c.id}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className="w-40" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar item</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5 flex-1 min-w-[220px]">
                <Label>Produto</Label>
                <Input
                  list="produtos-datalist"
                  value={produtoTexto}
                  onChange={(e) => handleProdutoChange(e.target.value)}
                  placeholder="Digite pra buscar..."
                />
                <datalist id="produtos-datalist">
                  {produtos.map((p) => <option key={p.id} value={produtoLabel(p)} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Qtde</Label>
                <Input type="number" step="any" value={qtdeItem} onChange={(e) => setQtdeItem(e.target.value)} className="w-24" />
              </div>
              <div className="space-y-1.5">
                <Label>Preço unit. {buscandoPreco && "(buscando...)"}</Label>
                <Input type="number" step="any" value={precoItem} onChange={(e) => setPrecoItem(e.target.value)} className="w-28" placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto</Label>
                <Input type="number" step="any" value={descontoItem} onChange={(e) => setDescontoItem(e.target.value)} className="w-24" />
              </div>
              <Button type="button" onClick={adicionarItem}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            </div>
          </div>

          {itens.length > 0 && (
            <div className="border-t border-border pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtde</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{it.descricao}</TableCell>
                      <TableCell className="text-right font-mono">{it.qtde}</TableCell>
                      <TableCell className="text-right font-mono">{fmtCur(it.preco_unitario)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtCur(it.desconto)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmtCur(it.qtde * it.preco_unitario - it.desconto)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => removerItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-6 pt-3 text-sm">
                <span className="text-muted-foreground">Bruto: <strong className="text-foreground">{fmtCur(totais.bruta)}</strong></span>
                <span className="text-muted-foreground">Desconto: <strong className="text-foreground">{fmtCur(totais.desconto)}</strong></span>
                <span className="text-muted-foreground">Líquido: <strong className="text-positive">{fmtCur(totais.liq)}</strong></span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={salvar} disabled={salvando || itens.length === 0}>
              <Save className="w-4 h-4 mr-1" /> {salvando ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Lançamentos manuais recentes</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              {podeEscolherRepresentante && <TableHead>Rep</TableHead>}
              <TableHead className="text-right">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidosAgrupados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">Nenhum lançamento manual ainda.</TableCell></TableRow>
            ) : (
              pedidosAgrupados.map((p) => (
                <TableRow key={p.pedido_nr} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">{p.pedido_nr}</TableCell>
                  <TableCell className="text-xs">{p.data_venda}</TableCell>
                  <TableCell>{nomeCliente(p.cliente_id)}</TableCell>
                  {podeEscolherRepresentante && <TableCell className="text-xs text-muted-foreground">{p.representante_id}</TableCell>}
                  <TableCell className="text-right font-mono">{p.itens}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtCur(p.total)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => excluir(p.pedido_nr)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
