"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { upsertFornecedor, upsertFornecedorAlias, deleteFornecedorAlias } from "@/app/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Truck, Plus, Trash2, AlertTriangle, Pencil, X, Save } from "lucide-react"

type Fornecedor = { id: number; nome_fantasia: string; ativo: boolean }
type Alias = { razao_social_erp: string; fornecedor_id: number }

export default function FornecedoresAdminPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [aliases, setAliases] = useState<Alias[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingNome, setEditingNome] = useState("")
  const [novoAliasRazao, setNovoAliasRazao] = useState("")
  const [novoAliasFornecedorId, setNovoAliasFornecedorId] = useState<string>("")

  async function load() {
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.from("fornecedores").select("*").order("nome_fantasia"),
      supabase.from("fornecedor_aliases").select("*").order("razao_social_erp"),
    ])
    setFornecedores(f || [])
    setAliases(a || [])
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: a }] = await Promise.all([
        supabase.from("fornecedores").select("*").order("nome_fantasia"),
        supabase.from("fornecedor_aliases").select("*").order("razao_social_erp"),
      ])
      setFornecedores(f || [])
      setAliases(a || [])
      setLoading(false)
    })()
  }, [])

  const naoMapeados = fornecedores.filter(f => f.nome_fantasia.startsWith("[Revisar]"))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    try {
      await upsertFornecedor({ nome_fantasia: novoNome.trim(), ativo: true })
      toast.success("Fornecedor criado!")
      setNovoNome("")
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleRename = async (f: Fornecedor) => {
    if (!editingNome.trim()) return
    try {
      await upsertFornecedor({ id: f.id, nome_fantasia: editingNome.trim(), ativo: f.ativo })
      toast.success("Fornecedor renomeado — revise se precisa criar/ajustar metas com o novo nome.")
      setEditingId(null)
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoAliasRazao.trim() || !novoAliasFornecedorId) return
    try {
      await upsertFornecedorAlias({ razao_social_erp: novoAliasRazao.trim(), fornecedor_id: Number(novoAliasFornecedorId) })
      toast.success("Alias cadastrado!")
      setNovoAliasRazao("")
      setNovoAliasFornecedorId("")
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleDeleteAlias = async (razao: string) => {
    try {
      await deleteFornecedorAlias(razao)
      toast.success("Alias removido")
      load()
    } catch {
      toast.error("Erro ao remover alias")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="w-8 h-8 text-blue-600" />
          Fornecedores
        </h1>
        <p className="text-muted-foreground">
          Nome fantasia usado nas telas de metas/rankings + o mapeamento de razão social do ERP pra cada um.
        </p>
      </div>

      {naoMapeados.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>{naoMapeados.length} fornecedor(es) criado(s) automaticamente</strong> na última importação
              (razão social do ERP sem alias conhecido). Renomeie pro nome fantasia correto abaixo.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome fantasia (ex: Chef Clay)" />
              <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Criar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo alias (razão social ERP → fornecedor)</CardTitle>
            <CardDescription>Use pra corrigir automaticamente o mapeamento na próxima importação.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAlias} className="flex flex-col gap-2">
              <Input value={novoAliasRazao} onChange={(e) => setNovoAliasRazao(e.target.value)} placeholder="Razão social exata do ERP" />
              <div className="flex gap-2">
                <select
                  value={novoAliasFornecedorId}
                  onChange={(e) => setNovoAliasFornecedorId(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                >
                  <option value="">Selecione o fornecedor...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
                </select>
                <Button type="submit"><Plus className="w-4 h-4" /></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Fornecedores cadastrados ({fornecedores.length})</CardTitle></CardHeader>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>Aliases (razão social ERP)</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-500">Carregando...</TableCell></TableRow>
            ) : fornecedores.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-500">Nenhum fornecedor cadastrado.</TableCell></TableRow>
            ) : (
              fornecedores.map((f) => (
                <TableRow key={f.id} className={`hover:bg-slate-50 ${f.nome_fantasia.startsWith("[Revisar]") ? "bg-amber-50/50" : ""}`}>
                  <TableCell className="font-semibold text-slate-800">
                    {editingId === f.id ? (
                      <div className="flex gap-2">
                        <Input value={editingNome} onChange={(e) => setEditingNome(e.target.value)} className="h-8" />
                        <Button size="icon" className="h-8 w-8" onClick={() => handleRename(f)}><Save className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      f.nome_fantasia
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {aliases.filter(a => a.fornecedor_id === f.id).map(a => (
                        <span key={a.razao_social_erp} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {a.razao_social_erp}
                          <button onClick={() => handleDeleteAlias(a.razao_social_erp)} className="hover:text-rose-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId !== f.id && (
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(f.id); setEditingNome(f.nome_fantasia) }} className="text-blue-600 hover:bg-blue-50">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
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
