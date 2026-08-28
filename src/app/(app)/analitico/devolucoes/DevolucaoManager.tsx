"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { criarDevolucao, atualizarDevolucao, excluirDevolucao, type DevolucaoPayload } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, X, Save } from "lucide-react"

type Representante = { id: string; nome: string }
type Cliente = { id: string; razao_social: string | null; fantasia: string | null }
type DevolucaoRow = {
  id: string
  pedido_nr: string
  data_venda: string
  cliente_id: string
  representante_id: string
  devolucao: number
  motivo_devolucao: string | null
  created_at: string
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const fmtCur = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const formVazio = () => ({
  cliente_id: "",
  representante_id: "",
  data_venda: hoje(),
  valor: "",
  motivo: "",
})

export default function DevolucaoManager({
  representantes,
  clientes,
  devolucoesIniciais,
}: {
  representantes: Representante[]
  clientes: Cliente[]
  devolucoesIniciais: DevolucaoRow[]
}) {
  const router = useRouter()
  const [devolucoes, setDevolucoes] = useState(devolucoesIniciais)
  const [form, setForm] = useState(formVazio())
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const nomeCliente = useMemo(() => {
    const map = new Map(clientes.map((c) => [c.id, c.fantasia || c.razao_social || c.id]))
    return (id: string) => map.get(id) ?? id
  }, [clientes])

  const cancelarEdicao = () => {
    setEditandoId(null)
    setForm(formVazio())
  }

  const iniciarEdicao = (row: DevolucaoRow) => {
    setEditandoId(row.id)
    setForm({
      cliente_id: row.cliente_id,
      representante_id: row.representante_id,
      data_venda: row.data_venda,
      valor: String(row.devolucao),
      motivo: row.motivo_devolucao ?? "",
    })
  }

  const salvar = async () => {
    const payload: DevolucaoPayload = {
      cliente_id: form.cliente_id,
      representante_id: form.representante_id,
      data_venda: form.data_venda,
      valor: Number(form.valor),
      motivo: form.motivo,
    }

    setSalvando(true)
    try {
      if (editandoId) {
        await atualizarDevolucao(editandoId, payload)
        toast.success("Devolução atualizada.")
      } else {
        await criarDevolucao(payload)
        toast.success("Devolução registrada.")
      }
      cancelarEdicao()
      router.refresh()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (row: DevolucaoRow) => {
    if (!window.confirm(`Excluir a devolução de ${nomeCliente(row.cliente_id)} (${fmtCur(row.devolucao)})?`)) return
    try {
      await excluirDevolucao(row.id)
      toast.success("Devolução excluída.")
      setDevolucoes((prev) => prev.filter((d) => d.id !== row.id))
      if (editandoId === row.id) cancelarEdicao()
      router.refresh()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{editandoId ? "Editar devolução" : "Registrar devolução manual"}</CardTitle>
        <CardDescription>
          Só devoluções lançadas por aqui podem ser editadas ou excluídas. Devoluções vindas do import do ERP continuam
          só-leitura — corrigi-las aqui seria desfeito no próximo reimport do período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Representante</Label>
            <select
              value={form.representante_id}
              onChange={(e) => setForm((f) => ({ ...f, representante_id: e.target.value }))}
              className="h-9 w-52 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {representantes.map((r) => (
                <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <select
              value={form.cliente_id}
              onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))}
              className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.fantasia || c.razao_social || c.id}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={form.data_venda} onChange={(e) => setForm((f) => ({ ...f, data_venda: e.target.value }))} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor devolvido</Label>
            <Input type="number" step="any" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} className="w-32" placeholder="0,00" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[220px]">
            <Label>Motivo</Label>
            <Input value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} placeholder="Ex.: Produto avariado" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editandoId && (
            <Button type="button" variant="ghost" onClick={cancelarEdicao}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          )}
          <Button onClick={salvar} disabled={salvando}>
            {editandoId ? <Save className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Registrar devolução"}
          </Button>
        </div>

        <div className="border-t border-border pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {devolucoes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Nenhuma devolução manual lançada ainda.</TableCell></TableRow>
              ) : (
                devolucoes.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs">{d.data_venda}</TableCell>
                    <TableCell>{nomeCliente(d.cliente_id)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.representante_id}</TableCell>
                    <TableCell>{d.motivo_devolucao || "—"}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-negative">{fmtCur(d.devolucao)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => iniciarEdicao(d)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => excluir(d)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
