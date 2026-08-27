"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { upsertComissaoFaixa, deleteComissaoFaixa } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Save } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

type Fornecedor = { id: number; nome_fantasia: string }
type Faixa = {
  id: number
  nome: string
  fornecedor_id: number | null
  ordem: number
  pct_atingimento_min: number
  pct_atingimento_max: number | null
  modo: "proporcional" | "fator_fixo"
  fator: number
  ativo: boolean
}

const emptyForm = {
  nome: "",
  fornecedor_id: "" as string,
  ordem: 1,
  pct_atingimento_min: 0,
  pct_atingimento_max: "" as string,
  modo: "proporcional" as "proporcional" | "fator_fixo",
  fator: 1,
}

export default function ComissoesAdminPage() {
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const [faixas, setFaixas] = useState<Faixa[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [salvandoId, setSalvandoId] = useState<number | null>(null)

  async function load() {
    const [{ data: f }, { data: forns }] = await Promise.all([
      supabase.from("comissao_faixas").select("*").order("fornecedor_id", { nullsFirst: true }).order("ordem"),
      supabase.from("fornecedores").select("id, nome_fantasia").order("nome_fantasia"),
    ])
    setFaixas(f || [])
    setFornecedores(forns || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const fornecedorNome = (id: number | null) => (id == null ? "Todos" : fornecedores.find((f) => f.id === id)?.nome_fantasia ?? id)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    try {
      await upsertComissaoFaixa({
        nome: form.nome.trim(),
        fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null,
        ordem: form.ordem,
        pct_atingimento_min: form.pct_atingimento_min,
        pct_atingimento_max: form.pct_atingimento_max === "" ? null : Number(form.pct_atingimento_max),
        modo: form.modo,
        fator: form.fator,
        ativo: true,
      })
      toast.success("Faixa criada!")
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const updateFaixa = (id: number, field: keyof Faixa, value: string | number | boolean | null) => {
    setFaixas((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  const salvarFaixa = async (faixa: Faixa) => {
    setSalvandoId(faixa.id)
    try {
      await upsertComissaoFaixa({
        id: faixa.id,
        nome: faixa.nome,
        fornecedor_id: faixa.fornecedor_id,
        ordem: faixa.ordem,
        pct_atingimento_min: faixa.pct_atingimento_min,
        pct_atingimento_max: faixa.pct_atingimento_max,
        modo: faixa.modo,
        fator: faixa.fator,
        ativo: faixa.ativo,
      })
      toast.success("Faixa salva!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSalvandoId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Excluir esta faixa de comissão?")) return
    try {
      await deleteComissaoFaixa(id)
      toast.success("Faixa excluída")
      setFaixas((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      toast.error("Erro ao excluir: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="admin.comissoes"
        title="Faixas de Comissão"
        subtitle="Configure as faixas de atingimento que definem o fator de comissão aplicado sobre o financeiro/positivação realizados. Percentuais de premiação por fornecedor ficam em /admin/metas."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova faixa</CardTitle>
          <CardDescription>Fornecedor em branco = aplica a todos os fornecedores sem faixa específica.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="w-40" placeholder="Ex: Acima de 100%" />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <select
                value={form.fornecedor_id}
                onChange={(e) => setForm((f) => ({ ...f, fornecedor_id: e.target.value }))}
                className="h-9 w-48 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="">Todos</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))} className="w-20" />
            </div>
            <div className="space-y-1.5">
              <Label>% Atingimento mín.</Label>
              <Input type="number" step="any" value={form.pct_atingimento_min} onChange={(e) => setForm((f) => ({ ...f, pct_atingimento_min: Number(e.target.value) }))} className="w-28" />
            </div>
            <div className="space-y-1.5">
              <Label>% Atingimento máx.</Label>
              <Input type="number" step="any" value={form.pct_atingimento_max} onChange={(e) => setForm((f) => ({ ...f, pct_atingimento_max: e.target.value }))} className="w-28" placeholder="sem teto" />
            </div>
            <div className="space-y-1.5">
              <Label>Modo</Label>
              <select
                value={form.modo}
                onChange={(e) => setForm((f) => ({ ...f, modo: e.target.value as "proporcional" | "fator_fixo" }))}
                className="h-9 w-36 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="proporcional">Proporcional</option>
                <option value="fator_fixo">Fator fixo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Fator</Label>
              <Input type="number" step="any" value={form.fator} onChange={(e) => setForm((f) => ({ ...f, fator: Number(e.target.value) }))} className="w-24" />
            </div>
            <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Faixas cadastradas ({faixas.length})</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Ordem</TableHead>
                <TableHead className="text-right">% Mín.</TableHead>
                <TableHead className="text-right">% Máx.</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead className="text-right">Fator</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : faixas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhuma faixa cadastrada.</TableCell></TableRow>
              ) : (
                faixas.map((f) => (
                  <TableRow key={f.id} className="hover:bg-muted/40">
                    <TableCell><Input value={f.nome} onChange={(e) => updateFaixa(f.id, "nome", e.target.value)} className="h-8 w-32" /></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{fornecedorNome(f.fornecedor_id)}</TableCell>
                    <TableCell className="text-right"><Input type="number" value={f.ordem} onChange={(e) => updateFaixa(f.id, "ordem", Number(e.target.value))} className="h-8 w-16 text-right" /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="any" value={f.pct_atingimento_min} onChange={(e) => updateFaixa(f.id, "pct_atingimento_min", Number(e.target.value))} className="h-8 w-20 text-right" /></TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="any"
                        value={f.pct_atingimento_max ?? ""}
                        onChange={(e) => updateFaixa(f.id, "pct_atingimento_max", e.target.value === "" ? null : Number(e.target.value))}
                        className="h-8 w-20 text-right"
                        placeholder="sem teto"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={f.modo}
                        onChange={(e) => updateFaixa(f.id, "modo", e.target.value)}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="proporcional">Proporcional</option>
                        <option value="fator_fixo">Fator fixo</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right"><Input type="number" step="any" value={f.fator} onChange={(e) => updateFaixa(f.id, "fator", Number(e.target.value))} className="h-8 w-20 text-right" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" className="h-8 w-8" disabled={salvandoId === f.id} onClick={() => salvarFaixa(f)}><Save className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
