"use client"

import React, { useState, useEffect } from "react"
import {
  listarEquipes,
  listarSupervisoresDisponiveis,
  listarRepresentantesComEquipe,
  criarEquipe,
  atualizarSupervisorEquipe,
  reatribuirRepresentante,
  type EquipeComDetalhes,
  type SupervisorDisponivel,
  type RepresentanteComEquipe,
} from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function EquipesAdminPage() {
  const [equipes, setEquipes] = useState<EquipeComDetalhes[]>([])
  const [supervisores, setSupervisores] = useState<SupervisorDisponivel[]>([])
  const [representantes, setRepresentantes] = useState<RepresentanteComEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNumero, setNovoNumero] = useState("")
  const [criando, setCriando] = useState(false)

  const load = async () => {
    const [eq, sup, reps] = await Promise.all([listarEquipes(), listarSupervisoresDisponiveis(), listarRepresentantesComEquipe()])
    setEquipes(eq)
    setSupervisores(sup)
    setRepresentantes(reps)
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      try {
        const [eq, sup, reps] = await Promise.all([listarEquipes(), listarSupervisoresDisponiveis(), listarRepresentantesComEquipe()])
        setEquipes(eq)
        setSupervisores(sup)
        setRepresentantes(reps)
      } catch (err) {
        toast.error("Erro ao carregar: " + (err instanceof Error ? err.message : String(err)))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNumero.trim()) return
    setCriando(true)
    try {
      await criarEquipe(novoNumero.trim())
      toast.success(`Equipe ${novoNumero.trim()} criada, cor atribuída automaticamente.`)
      setNovoNumero("")
      load()
    } catch (err) {
      toast.error("Erro ao criar equipe: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setCriando(false)
    }
  }

  const handleSupervisor = async (equipeId: string, supervisorId: string) => {
    try {
      await atualizarSupervisorEquipe(equipeId, supervisorId || null)
      toast.success("Supervisor atualizado.")
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleReatribuir = async (representanteId: string, equipeId: string) => {
    try {
      await reatribuirRepresentante(representanteId, equipeId || null)
      toast.success(`Representante ${representanteId} atualizado.`)
      load()
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        ajuda="admin.equipes"
        title="Equipes"
        subtitle="Cada equipe tem um supervisor e um grupo de representantes. Cor atribuída automaticamente e fixa — não muda depois de criada."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Nova equipe</CardTitle>
          <CardDescription>Número vindo do ERP (ex: 98). A cor é escolhida automaticamente, sem repetir a de nenhuma equipe existente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCriar} className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} className="w-32" placeholder="ex: 98" />
            </div>
            <Button type="submit" disabled={criando || !novoNumero.trim()}>{criando ? "Criando..." : "Criar equipe"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Equipes cadastradas</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16">Cor</TableHead>
              <TableHead className="w-24">Equipe</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead className="w-40 text-right">Representantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : equipes.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhuma equipe cadastrada.</TableCell></TableRow>
            ) : (
              equipes.map((eq) => (
                <TableRow key={eq.id} className="hover:bg-muted/40">
                  <TableCell>
                    <span
                      className="inline-block w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: eq.cor }}
                      title={eq.cor}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">{eq.id}</TableCell>
                  <TableCell>
                    <select
                      className={`${selectClass} w-64`}
                      value={eq.supervisor_id ?? ""}
                      onChange={(e) => handleSupervisor(eq.id, e.target.value)}
                    >
                      <option value="">Sem supervisor</option>
                      {supervisores.map((s) => (
                        <option key={s.id} value={s.id} disabled={!!s.equipe_atual && s.equipe_atual !== eq.id}>
                          {s.nome}{s.equipe_atual && s.equipe_atual !== eq.id ? ` (já é da equipe ${s.equipe_atual})` : ""}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{eq.representantes_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Representantes por equipe</CardTitle>
          <CardDescription>Reatribua a equipe de um representante diretamente aqui — não precisa esperar confirmação externa.</CardDescription>
        </CardHeader>
        <div className="max-h-[480px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0">
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-56">Equipe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : representantes.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Nenhum representante cadastrado.</TableCell></TableRow>
              ) : (
                representantes.map((rep) => (
                  <TableRow key={rep.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono font-medium">{rep.id}</TableCell>
                    <TableCell className="text-muted-foreground">{rep.nome}</TableCell>
                    <TableCell>
                      <select
                        className={`${selectClass} w-full`}
                        value={rep.equipe_id ?? ""}
                        onChange={(e) => handleReatribuir(rep.id, e.target.value)}
                      >
                        <option value="">Sem equipe</option>
                        {equipes.map((eq) => (
                          <option key={eq.id} value={eq.id}>Equipe {eq.id}</option>
                        ))}
                      </select>
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
