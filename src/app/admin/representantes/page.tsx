"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { upsertRepresentante, deleteRepresentante } from "@/app/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, X, Save } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

type Representante = { id: string; nome: string; supervisor: string | null }

const emptyForm = { id: "", nome: "", supervisor: "" }

export default function RepresentantesAdminPage() {
  const [reps, setReps] = useState<Representante[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  async function load() {
    const { data, error } = await supabase.from("representantes").select("*").order("id")
    if (error) toast.error("Erro ao carregar representantes")
    setReps(data || [])
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("representantes").select("*").order("id")
      if (error) toast.error("Erro ao carregar representantes")
      setReps(data || [])
      setLoading(false)
    })()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.id || !formData.nome) {
      toast.error("ID e Nome são obrigatórios")
      return
    }
    try {
      await upsertRepresentante({ id: formData.id, nome: formData.nome, supervisor: formData.supervisor || null })
      toast.success(isEditing ? "Representante atualizado!" : "Representante criado!")
      setFormData(emptyForm)
      setIsEditing(false)
      load()
    } catch (err) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleEdit = (rep: Representante) => {
    setFormData({ id: rep.id, nome: rep.nome, supervisor: rep.supervisor || "" })
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Excluir representante ${id}? Isso falha se ainda houver vendas/clientes vinculados.`)) return
    try {
      await deleteRepresentante(id)
      toast.success("Representante excluído")
      setReps(reps.filter(r => r.id !== id))
    } catch {
      toast.error("Erro ao excluir (provavelmente há vendas/metas/clientes vinculados)")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Gestão de Representantes (RPA)"
        subtitle='O ID deve bater com o código usado na coluna "Representante" do ERP (ex: 308).'
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className={`sticky top-6 border-t-4 ${isEditing ? 'border-t-amber-500' : 'border-t-blue-600'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isEditing ? <Pencil className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {isEditing ? "Editar" : "Novo"} Representante
              </CardTitle>
              <CardDescription>Ex: id=308, nome=&quot;308 REPRESENTANTE&quot;</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="id">ID <span className="text-red-500">*</span></Label>
                  <Input id="id" name="id" value={formData.id} onChange={handleChange} disabled={isEditing} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome <span className="text-red-500">*</span></Label>
                  <Input id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Input id="supervisor" name="supervisor" value={formData.supervisor} onChange={handleChange} />
                </div>
                <div className="pt-2 flex gap-2">
                  <Button type="submit" className="w-full flex items-center gap-2">
                    <Save className="w-4 h-4" /> Salvar
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={() => { setFormData(emptyForm); setIsEditing(false) }} className="w-full">
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : reps.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum representante cadastrado.</TableCell></TableRow>
                ) : (
                  reps.map((rep) => (
                    <TableRow key={rep.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono font-medium">{rep.id}</TableCell>
                      <TableCell className="font-semibold text-foreground">{rep.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{rep.supervisor || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(rep)} className="text-blue-600 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(rep.id)} className="text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  )
}
