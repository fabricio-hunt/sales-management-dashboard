"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { upsertMeta, upsertMetaRepresentante, upsertMetasEmLote } from "@/app/(app)/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

type Fornecedor = { id: number; nome_fantasia: string }
type Representante = { id: string; nome: string }
type MetaLinha = {
  fornecedor_id: number
  meta_cx: number
  meta_dia_cx: number
  meta_fin: number
  preco_medio: number
  desafio_dist: number
  premiacao_pct_cx: number
  premiacao_pct_fin: number
}

function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function mesAnterior(mes: string) {
  const [ano, m] = mes.split("-").map(Number)
  const d = new Date(ano, m - 2, 1) // m já é 1-indexed; -2 volta um mês
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function emptyLinha(fornecedor_id: number): MetaLinha {
  return { fornecedor_id, meta_cx: 0, meta_dia_cx: 0, meta_fin: 0, preco_medio: 0, desafio_dist: 0, premiacao_pct_cx: 0, premiacao_pct_fin: 0 }
}

export default function MetasAdminPage() {
  const supabase = useMemo(() => createBrowserSupabase(), [])
  const [mes, setMes] = useState(mesAtual())
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [repId, setRepId] = useState("")
  const [linhas, setLinhas] = useState<Record<number, MetaLinha>>({})
  const [objPositivacao, setObjPositivacao] = useState(0)
  const [cadastroOverride, setCadastroOverride] = useState<string>("")
  const [baseAtivaOverride, setBaseAtivaOverride] = useState<string>("")
  const [positivacaoOverride, setPositivacaoOverride] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [salvandoTudo, setSalvandoTudo] = useState(false)
  const [copiando, setCopiando] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data: reps }, { data: forns }] = await Promise.all([
        supabase.from("representantes").select("id, nome").order("id"),
        supabase.from("fornecedores").select("id, nome_fantasia").order("nome_fantasia"),
      ])
      setRepresentantes(reps || [])
      setFornecedores(forns || [])
      if (reps && reps.length > 0) setRepId(reps[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!repId || fornecedores.length === 0) return
    (async () => {
      const [{ data: metas }, { data: metaRep }] = await Promise.all([
        supabase.from("metas").select("*").eq("mes", mes).eq("representante_id", repId),
        supabase.from("metas_representante").select("*").eq("mes", mes).eq("representante_id", repId).maybeSingle(),
      ])

      const map: Record<number, MetaLinha> = {}
      for (const f of fornecedores) map[f.id] = emptyLinha(f.id)
      for (const m of metas || []) {
        map[m.fornecedor_id] = {
          fornecedor_id: m.fornecedor_id,
          meta_cx: Number(m.meta_cx),
          meta_dia_cx: Number(m.meta_dia_cx),
          meta_fin: Number(m.meta_fin),
          preco_medio: Number(m.preco_medio),
          desafio_dist: Number(m.desafio_dist),
          premiacao_pct_cx: Number(m.premiacao_pct_cx),
          premiacao_pct_fin: Number(m.premiacao_pct_fin),
        }
      }
      setLinhas(map)
      setObjPositivacao(metaRep?.obj_positivacao ?? 0)
      setCadastroOverride(metaRep?.cadastro_total_override?.toString() ?? "")
      setBaseAtivaOverride(metaRep?.base_ativa_override?.toString() ?? "")
      setPositivacaoOverride(metaRep?.positivacao_realizado_override?.toString() ?? "")
      setLoading(false)
    })()
  }, [mes, repId, fornecedores])

  const updateLinha = (fornecedorId: number, field: keyof MetaLinha, value: number) => {
    setLinhas(prev => ({ ...prev, [fornecedorId]: { ...prev[fornecedorId], [field]: value } }))
  }

  const salvarLinha = async (fornecedorId: number) => {
    setSavingId(fornecedorId)
    try {
      await upsertMeta({ mes, representante_id: repId, ...linhas[fornecedorId] })
      toast.success("Meta salva!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSavingId(null)
    }
  }

  const copiarMesAnterior = async () => {
    if (!repId) return
    setCopiando(true)
    try {
      const mesAnt = mesAnterior(mes)
      const { data: metasAnteriores } = await supabase
        .from("metas")
        .select("*")
        .eq("mes", mesAnt)
        .eq("representante_id", repId)

      if (!metasAnteriores || metasAnteriores.length === 0) {
        toast.error(`Sem metas encontradas em ${mesAnt.slice(0, 7)} pra esse representante.`)
        return
      }

      setLinhas((prev) => {
        const novo = { ...prev }
        for (const m of metasAnteriores) {
          novo[m.fornecedor_id] = {
            fornecedor_id: m.fornecedor_id,
            meta_cx: Number(m.meta_cx),
            meta_dia_cx: Number(m.meta_dia_cx),
            meta_fin: Number(m.meta_fin),
            preco_medio: Number(m.preco_medio),
            desafio_dist: Number(m.desafio_dist),
            premiacao_pct_cx: Number(m.premiacao_pct_cx),
            premiacao_pct_fin: Number(m.premiacao_pct_fin),
          }
        }
        return novo
      })
      toast.success(`${metasAnteriores.length} meta(s) copiada(s) de ${mesAnt.slice(0, 7)} — revise e salve.`)
    } finally {
      setCopiando(false)
    }
  }

  const salvarTudo = async () => {
    setSalvandoTudo(true)
    try {
      await upsertMetasEmLote({
        mes,
        representante_id: repId,
        linhas: fornecedores.map((f) => linhas[f.id] ?? emptyLinha(f.id)),
      })
      toast.success("Todas as metas do representante foram salvas!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSalvandoTudo(false)
    }
  }

  const salvarObjetivos = async () => {
    try {
      await upsertMetaRepresentante({
        mes,
        representante_id: repId,
        obj_positivacao: objPositivacao,
        cadastro_total_override: cadastroOverride ? Number(cadastroOverride) : null,
        base_ativa_override: baseAtivaOverride ? Number(baseAtivaOverride) : null,
        positivacao_realizado_override: positivacaoOverride ? Number(positivacaoOverride) : null,
      })
      toast.success("Objetivos do representante salvos!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1300px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="admin.metas"
        title="Metas por Representante × Fornecedor"
        subtitle="Substitui os hardcodes de metas — edite mês a mês sem precisar de redeploy."
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label>Mês</Label>
          <Input type="month" value={mes.slice(0, 7)} onChange={(e) => setMes(`${e.target.value}-01`)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>Representante</Label>
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            {representantes.map(r => <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>)}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objetivos do representante (não é por fornecedor)</CardTitle>
          <CardDescription>Obj. Positivação e overrides de Cadastro Total/Base Ativa (deixe em branco pra calcular pela carteira em /admin/clientes).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Obj. Positivação</Label>
            <Input type="number" value={objPositivacao} onChange={(e) => setObjPositivacao(Number(e.target.value))} className="w-36" />
          </div>
          <div className="space-y-1.5">
            <Label>Cadastro Total (override)</Label>
            <Input type="number" value={cadastroOverride} onChange={(e) => setCadastroOverride(e.target.value)} className="w-36" placeholder="auto" />
          </div>
          <div className="space-y-1.5">
            <Label>Base Ativa (override)</Label>
            <Input type="number" value={baseAtivaOverride} onChange={(e) => setBaseAtivaOverride(e.target.value)} className="w-36" placeholder="auto" />
          </div>
          <div className="space-y-1.5">
            <Label>Positivação Realizado (override)</Label>
            <Input type="number" value={positivacaoOverride} onChange={(e) => setPositivacaoOverride(e.target.value)} className="w-36" placeholder="auto" />
          </div>
          <Button onClick={salvarObjetivos}><Save className="w-4 h-4 mr-1" /> Salvar objetivos</Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={copiarMesAnterior} disabled={copiando || !repId}>
          {copiando ? "Copiando..." : `Copiar metas de ${mesAnterior(mes).slice(0, 7)}`}
        </Button>
        <Button onClick={salvarTudo} disabled={salvandoTudo}>
          <Save className="w-4 h-4 mr-1" /> {salvandoTudo ? "Salvando..." : "Salvar tudo"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left">Fornecedor</th>
                <th className="px-2 py-2 text-right">Meta Cx</th>
                <th className="px-2 py-2 text-right">Meta Dia Cx</th>
                <th className="px-2 py-2 text-right">Meta Fin (R$)</th>
                <th className="px-2 py-2 text-right">Preço Médio</th>
                <th className="px-2 py-2 text-right">Desafio Dist.</th>
                <th className="px-2 py-2 text-right">Prem. Cx (%)</th>
                <th className="px-2 py-2 text-right">Prem. Fin (%)</th>
                <th className="px-2 py-2 text-right w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
              ) : (
                fornecedores.map((f) => {
                  const linha = linhas[f.id] ?? emptyLinha(f.id)
                  return (
                    <tr key={f.id} className="border-b border-border hover:bg-muted/40">
                      <td className="px-3 py-1.5 font-medium text-foreground">{f.nome_fantasia}</td>
                      {(["meta_cx", "meta_dia_cx", "meta_fin", "preco_medio", "desafio_dist", "premiacao_pct_cx", "premiacao_pct_fin"] as const).map((field) => (
                        <td key={field} className="px-1 py-1">
                          <input
                            type="number"
                            step="any"
                            value={linha[field]}
                            onChange={(e) => updateLinha(f.id, field, Number(e.target.value))}
                            className="w-full h-8 text-right text-xs px-2 rounded border border-border font-mono"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right">
                        <Button size="sm" variant="outline" disabled={savingId === f.id} onClick={() => salvarLinha(f.id)}>
                          {savingId === f.id ? "..." : "Salvar"}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
