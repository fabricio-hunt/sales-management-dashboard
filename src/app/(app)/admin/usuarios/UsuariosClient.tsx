"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { createUsuario, updateUsuario, deleteUsuario, resetarSenha, setSupervisorRepresentantes } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Save, ChevronDown, ChevronUp, KeyRound } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

type Role = "manager" | "supervisor" | "vendedor"
type Usuario = { id: string; nome: string; role: Role; representante_id: string | null; ativo: boolean; senha_provisoria: boolean }
type Representante = { id: string; nome: string }

const ROLE_LABEL: Record<Role, string> = { manager: "Manager", supervisor: "Supervisor", vendedor: "Vendedor" }

const emptyForm = { email: "", password: "", nome: "", role: "vendedor" as Role, representante_id: "" }

export default function UsuariosAdminPage() {
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [atribuicoes, setAtribuicoes] = useState<Record<string, string[]>>({}) // supervisor_id -> representante_id[]
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [criando, setCriando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [resetando, setResetando] = useState<string | null>(null)
  const [novaSenha, setNovaSenha] = useState("")
  const [salvandoReset, setSalvandoReset] = useState(false)

  async function load() {
    const [{ data: users }, { data: reps }, { data: sup }] = await Promise.all([
      supabase.from("profiles").select("id, nome, role, representante_id, ativo, senha_provisoria").order("nome"),
      supabase.from("representantes").select("id, nome").order("id"),
      supabase.from("supervisor_representantes").select("supervisor_id, representante_id"),
    ])
    setUsuarios(users || [])
    setRepresentantes(reps || [])
    const map: Record<string, string[]> = {}
    for (const row of sup || []) {
      map[row.supervisor_id] = [...(map[row.supervisor_id] ?? []), row.representante_id]
    }
    setAtribuicoes(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.nome) {
      toast.error("E-mail, senha e nome são obrigatórios")
      return
    }
    setCriando(true)
    try {
      await createUsuario({
        email: form.email,
        password: form.password,
        nome: form.nome,
        role: form.role,
        representante_id: form.role === "vendedor" ? form.representante_id || null : null,
      })
      toast.success("Usuário criado!")
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setCriando(false)
    }
  }

  const updateLocal = (id: string, field: keyof Usuario, value: string | boolean | null) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)))
  }

  const salvarUsuario = async (u: Usuario) => {
    try {
      await updateUsuario({ id: u.id, nome: u.nome, role: u.role, representante_id: u.representante_id, ativo: u.ativo })
      toast.success("Usuário salvo!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este usuário? O login dele deixa de funcionar imediatamente.")) return
    try {
      await deleteUsuario(id)
      toast.success("Usuário excluído")
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
    } catch (err) {
      toast.error("Erro ao excluir: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const abrirReset = (id: string) => {
    setNovaSenha("")
    setResetando(resetando === id ? null : id)
  }

  const confirmarReset = async (u: Usuario) => {
    if (novaSenha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres")
      return
    }
    setSalvandoReset(true)
    try {
      await resetarSenha({ id: u.id, password: novaSenha })
      toast.success(`Senha de ${u.nome} redefinida. Ele troca no próximo acesso.`)
      setResetando(null)
      setNovaSenha("")
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSalvandoReset(false)
    }
  }

  const toggleRepresentante = (supervisorId: string, repId: string) => {
    setAtribuicoes((prev) => {
      const atuais = prev[supervisorId] ?? []
      const novo = atuais.includes(repId) ? atuais.filter((r) => r !== repId) : [...atuais, repId]
      return { ...prev, [supervisorId]: novo }
    })
  }

  const salvarAtribuicoes = async (supervisorId: string) => {
    try {
      await setSupervisorRepresentantes(supervisorId, atribuicoes[supervisorId] ?? [])
      toast.success("Representantes atribuídos!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="admin.usuarios"
        title="Usuários"
        subtitle="Cadastro de Managers, Supervisores e Vendedores. Permissões por módulo ficam em /admin/permissoes."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo usuário</CardTitle>
          <CardDescription>Vendedor precisa de um representante vinculado — é o que restringe os dados que ele enxerga.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="w-44" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-56" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-40" placeholder="mín. 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                className="h-9 w-36 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="vendedor">Vendedor</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {form.role === "vendedor" && (
              <div className="space-y-1.5">
                <Label>Representante</Label>
                <select
                  value={form.representante_id}
                  onChange={(e) => setForm((f) => ({ ...f, representante_id: e.target.value }))}
                  className="h-9 w-48 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                >
                  <option value="">Selecione...</option>
                  {representantes.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>)}
                </select>
              </div>
            )}
            <Button type="submit" disabled={criando}><Plus className="w-4 h-4 mr-1" /> {criando ? "Criando..." : "Criar"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Usuários cadastrados ({usuarios.length})</CardTitle></CardHeader>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Representante</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum usuário cadastrado.</TableCell></TableRow>
            ) : (
              usuarios.map((u) => (
                <React.Fragment key={u.id}>
                  <TableRow className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input value={u.nome} onChange={(e) => updateLocal(u.id, "nome", e.target.value)} className="h-8 w-40" />
                        {u.senha_provisoria && (
                          <span
                            title="Ainda não trocou a senha inicial — só consegue entrar passando pela tela de troca."
                            className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                          >
                            senha provisória
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        onChange={(e) => updateLocal(u.id, "role", e.target.value)}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="manager">Manager</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {u.role === "vendedor" ? (
                        <select
                          value={u.representante_id ?? ""}
                          onChange={(e) => updateLocal(u.id, "representante_id", e.target.value || null)}
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                        >
                          <option value="">- nenhum -</option>
                          {representantes.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>)}
                        </select>
                      ) : u.role === "supervisor" ? (
                        <button
                          onClick={() => setExpandido(expandido === u.id ? null : u.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {(atribuicoes[u.id] ?? []).length} representante(s)
                          {expandido === u.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={u.ativo} onCheckedChange={(checked) => updateLocal(u.id, "ativo", checked === true)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" className="h-8 w-8" onClick={() => salvarUsuario(u)}><Save className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="Redefinir senha" className="h-8 w-8" onClick={() => abrirReset(u.id)}><KeyRound className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {resetando === u.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30">
                        <div className="flex flex-wrap items-end gap-3 p-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nova senha para {u.nome}</Label>
                            <Input
                              type="text"
                              value={novaSenha}
                              onChange={(e) => setNovaSenha(e.target.value)}
                              className="h-8 w-48"
                              placeholder="mín. 6 caracteres"
                              autoFocus
                            />
                          </div>
                          <Button size="sm" disabled={salvandoReset} onClick={() => confirmarReset(u)}>
                            <KeyRound className="w-3.5 h-3.5 mr-1" /> {salvandoReset ? "Redefinindo..." : "Redefinir"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResetando(null)}>Cancelar</Button>
                          <p className="text-xs text-muted-foreground">
                            Anote e entregue à pessoa: ela vai precisar dessa senha uma vez e trocará por outra no
                            primeiro acesso.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {u.role === "supervisor" && expandido === u.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/30">
                        <div className="p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Representantes que este supervisor pode ver:</p>
                          <div className="flex flex-wrap gap-3">
                            {representantes.map((r) => (
                              <label key={r.id} className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                  checked={(atribuicoes[u.id] ?? []).includes(r.id)}
                                  onCheckedChange={() => toggleRepresentante(u.id, r.id)}
                                />
                                {r.id} — {r.nome}
                              </label>
                            ))}
                          </div>
                          <Button size="sm" onClick={() => salvarAtribuicoes(u.id)}><Save className="w-3.5 h-3.5 mr-1" /> Salvar atribuições</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
