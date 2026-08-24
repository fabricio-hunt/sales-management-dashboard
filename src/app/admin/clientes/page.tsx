"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, X, Search, UserCircle, Save } from "lucide-react"

type Cliente = {
  id: string
  razao_social: string
  fantasia: string
  cnpj: string
  municipio: string
  uf: string
  created_at: string
}

export default function ClientesAdminPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    id: "",
    razao_social: "",
    fantasia: "",
    cnpj: "",
    municipio: "",
    uf: "",
  })

  // Fetch
  async function loadClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
    
    if (error) {
      toast.error("Erro ao carregar clientes")
      console.error(error)
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClientes()
  }, [])

  // Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Save (Create/Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.id) {
      toast.error("ID (Cód. Pessoa) é obrigatório")
      return
    }

    try {
      const payload = {
        id: formData.id,
        razao_social: formData.razao_social || null,
        fantasia: formData.fantasia || null,
        cnpj: formData.cnpj || null,
        municipio: formData.municipio || null,
        uf: formData.uf || null,
      }

      if (isEditing) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", formData.id)

        if (error) throw error
        toast.success("Cliente atualizado com sucesso!")
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert([payload])

        if (error) {
          if (error.code === '23505') {
             toast.error("Este ID já está cadastrado")
             return
          }
          throw error
        }
        toast.success("Cliente criado com sucesso!")
      }

      setFormData({ id: "", razao_social: "", fantasia: "", cnpj: "", municipio: "", uf: "" })
      setIsEditing(false)
      loadClientes()
    } catch (err: any) {
      console.error(err)
      toast.error("Erro ao salvar cliente: " + err.message)
    }
  }

  // Edit
  const handleEdit = (cliente: Cliente) => {
    setFormData({
      id: cliente.id,
      razao_social: cliente.razao_social || "",
      fantasia: cliente.fantasia || "",
      cnpj: cliente.cnpj || "",
      municipio: cliente.municipio || "",
      uf: cliente.uf || "",
    })
    setIsEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Cancel Edit
  const handleCancelEdit = () => {
    setFormData({ id: "", razao_social: "", fantasia: "", cnpj: "", municipio: "", uf: "" })
    setIsEditing(false)
  }

  // Delete
  const handleDelete = async (id: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${id}?`)) {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id)

      if (error) {
        toast.error("Erro ao excluir cliente. Verifique se não há vendas vinculadas.")
        console.error(error)
      } else {
        toast.success("Cliente excluído com sucesso")
        setClientes(clientes.filter(c => c.id !== id))
      }
    }
  }

  const filteredClientes = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.includes(searchTerm)
  )

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="w-8 h-8 text-blue-600" />
          Gestão de Clientes
        </h1>
        <p className="text-muted-foreground">
          Adicione, edite ou remova clientes manualmente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1">
          <Card className={`sticky top-6 border-t-4 ${isEditing ? 'border-t-amber-500' : 'border-t-blue-600'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isEditing ? <Pencil className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {isEditing ? "Editar Cliente" : "Novo Cliente"}
              </CardTitle>
              <CardDescription>
                {isEditing ? "Atualize as informações do cliente selecionado." : "Preencha os dados para adicionar."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="id">ID (Cód. Pessoa) <span className="text-red-500">*</span></Label>
                  <Input 
                    id="id" 
                    name="id" 
                    value={formData.id} 
                    onChange={handleChange} 
                    disabled={isEditing} 
                    placeholder="Ex: 102938" 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input 
                    id="razao_social" 
                    name="razao_social" 
                    value={formData.razao_social} 
                    onChange={handleChange} 
                    placeholder="Razão Social Ltda" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fantasia">Nome Fantasia</Label>
                  <Input 
                    id="fantasia" 
                    name="fantasia" 
                    value={formData.fantasia} 
                    onChange={handleChange} 
                    placeholder="Fantasia" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input 
                    id="cnpj" 
                    name="cnpj" 
                    value={formData.cnpj} 
                    onChange={handleChange} 
                    placeholder="00.000.000/0000-00" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="municipio">Município</Label>
                    <Input 
                      id="municipio" 
                      name="municipio" 
                      value={formData.municipio} 
                      onChange={handleChange} 
                      placeholder="São Paulo" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input 
                      id="uf" 
                      name="uf" 
                      value={formData.uf} 
                      onChange={handleChange} 
                      placeholder="SP" 
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button type="submit" className="w-full flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {isEditing ? "Salvar" : "Adicionar"}
                  </Button>
                  
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full">
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  )}
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* LISTAGEM */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center relative">
            <Search className="w-5 h-5 absolute left-3 text-slate-400" />
            <Input 
              placeholder="Buscar por ID, Razão Social ou Fantasia..." 
              className="pl-10 h-12 text-md bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-[700px]">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Razão Social / Fantasia</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        Carregando clientes...
                      </TableCell>
                    </TableRow>
                  ) : filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-medium">{cliente.id}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">{cliente.razao_social || "Sem Razão Social"}</div>
                          <div className="text-sm text-slate-500">{cliente.fantasia || "Sem Fantasia"}</div>
                          <div className="text-xs text-slate-400 mt-1">{cliente.cnpj}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{cliente.municipio || "-"}</div>
                          <div className="text-xs font-semibold text-slate-500">{cliente.uf || "-"}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cliente.id)} className="text-rose-600 hover:text-rose-800 hover:bg-rose-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      </div>
    </div>
  )
}
