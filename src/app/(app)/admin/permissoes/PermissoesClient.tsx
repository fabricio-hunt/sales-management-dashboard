"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { upsertPermissaoRole, upsertPermissaoUsuario, removerPermissaoUsuario } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/PageHeader"

type Role = "manager" | "supervisor" | "vendedor"
type Nivel = "nenhum" | "visualizar" | "editar"
type Modulo = { slug: string; label: string; grupo: string }
type Usuario = { id: string; nome: string; role: Role }

const ROLES: Role[] = ["vendedor", "supervisor", "manager"]
const ROLE_LABEL: Record<Role, string> = { manager: "Manager", supervisor: "Supervisor", vendedor: "Vendedor" }
const NIVEIS: Nivel[] = ["nenhum", "visualizar", "editar"]

function NivelSelect({ value, onChange, disabled }: { value: Nivel; onChange: (v: Nivel) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Nivel)}
      className={`h-7 rounded-md border border-input bg-transparent px-1.5 text-xs shadow-sm ${
        value === "editar" ? "text-positive font-semibold" : value === "visualizar" ? "text-amber-600" : "text-muted-foreground"
      }`}
    >
      {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

export default function PermissoesAdminPage() {
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [porRole, setPorRole] = useState<Record<string, Nivel>>({}) // `${role}:${slug}` -> nivel
  const [porUsuario, setPorUsuario] = useState<Record<string, Nivel>>({}) // `${userId}:${slug}` -> nivel (só overrides)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>("")
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: mods }, { data: users }, { data: roleRows }, { data: userRows }] = await Promise.all([
      supabase.from("modulos").select("slug, label, grupo"),
      supabase.from("profiles").select("id, nome, role").order("nome"),
      supabase.from("permissoes_role").select("role, modulo_slug, nivel"),
      supabase.from("permissoes_usuario").select("user_id, modulo_slug, nivel"),
    ])
    setModulos(mods || [])
    setUsuarios((users || []).filter((u) => u.role !== "manager"))
    const roleMap: Record<string, Nivel> = {}
    for (const r of roleRows || []) roleMap[`${r.role}:${r.modulo_slug}`] = r.nivel
    setPorRole(roleMap)
    const userMap: Record<string, Nivel> = {}
    for (const r of userRows || []) userMap[`${r.user_id}:${r.modulo_slug}`] = r.nivel
    setPorUsuario(userMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grupos = useMemo(() => {
    const g = new Map<string, Modulo[]>()
    for (const m of modulos) g.set(m.grupo, [...(g.get(m.grupo) ?? []), m])
    return [...g.entries()]
  }, [modulos])

  const alterarRole = async (role: Role, slug: string, nivel: Nivel) => {
    setPorRole((prev) => ({ ...prev, [`${role}:${slug}`]: nivel }))
    try {
      await upsertPermissaoRole(role, slug, nivel)
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const alterarUsuario = async (userId: string, slug: string, nivel: Nivel | "herdar") => {
    try {
      if (nivel === "herdar") {
        await removerPermissaoUsuario(userId, slug)
        setPorUsuario((prev) => {
          const novo = { ...prev }
          delete novo[`${userId}:${slug}`]
          return novo
        })
      } else {
        await upsertPermissaoUsuario(userId, slug, nivel)
        setPorUsuario((prev) => ({ ...prev, [`${userId}:${slug}`]: nivel }))
      }
      toast.success("Permissão atualizada!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const usuarioAtual = usuarios.find((u) => u.id === usuarioSelecionado)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Permissões"
        subtitle="Defina o que cada perfil vê por padrão, e ajuste exceções por usuário quando necessário."
      />

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Por perfil</TabsTrigger>
            <TabsTrigger value="usuario">Por usuário</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="pt-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Default por perfil</CardTitle>
                <CardDescription>
                  Manager sempre tem acesso total (não passa por aqui). Vendedor e Supervisor herdam isso por padrão em todo módulo — o supervisor ainda depende de ter representantes atribuídos em /admin/usuarios pra enxergar dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {grupos.map(([grupo, mods]) => (
                  <div key={grupo}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{grupo}</p>
                    <div className="space-y-1">
                      {mods.map((m) => (
                        <div key={m.slug} className="flex items-center justify-between gap-4 py-1.5 border-b border-border/60 last:border-0">
                          <span className="text-sm text-foreground">{m.label}</span>
                          <div className="flex items-center gap-4">
                            {(["vendedor", "supervisor"] as Role[]).map((role) => (
                              <div key={role} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase w-16">{ROLE_LABEL[role]}</span>
                                <NivelSelect
                                  value={porRole[`${role}:${m.slug}`] ?? "nenhum"}
                                  onChange={(v) => alterarRole(role, m.slug, v)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuario" className="pt-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">Exceção por usuário</CardTitle>
                <CardDescription>Sobrescreve o default do perfil só pra esse usuário. &quot;herdar&quot; volta a usar o default do perfil.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  value={usuarioSelecionado}
                  onChange={(e) => setUsuarioSelecionado(e.target.value)}
                  className="h-9 w-72 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                >
                  <option value="">Selecione um usuário...</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome} ({ROLE_LABEL[u.role]})</option>)}
                </select>

                {usuarioAtual && (
                  <div className="space-y-6 pt-2">
                    {grupos.map(([grupo, mods]) => (
                      <div key={grupo}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{grupo}</p>
                        <div className="space-y-1">
                          {mods.map((m) => {
                            const override = porUsuario[`${usuarioAtual.id}:${m.slug}`]
                            const efetivo = override ?? porRole[`${usuarioAtual.role}:${m.slug}`] ?? "nenhum"
                            return (
                              <div key={m.slug} className="flex items-center justify-between gap-4 py-1.5 border-b border-border/60 last:border-0">
                                <span className="text-sm text-foreground">{m.label}</span>
                                <div className="flex items-center gap-2">
                                  {override && <span className="text-[10px] text-amber-600 uppercase">override</span>}
                                  <select
                                    value={override ?? "herdar"}
                                    onChange={(e) => alterarUsuario(usuarioAtual.id, m.slug, e.target.value as Nivel | "herdar")}
                                    className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs shadow-sm"
                                  >
                                    <option value="herdar">herdar ({efetivo})</option>
                                    {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
