"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { upsertPeriodo } from "@/app/admin/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Settings, Save } from "lucide-react"

function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

export default function ConfiguracoesPage() {
  const [mes, setMes] = useState(mesAtual())
  const [form, setForm] = useState({ data_inicio: "", data_fim: "", dias_uteis: 21, regiao: "", status: "aberto" as "aberto" | "fechado" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("periodos").select("*").eq("mes", mes).maybeSingle()
      if (data) {
        setForm({ data_inicio: data.data_inicio, data_fim: data.data_fim, dias_uteis: data.dias_uteis, regiao: data.regiao ?? "", status: data.status })
      } else {
        const [ano, m] = mes.split("-")
        const ultimoDia = new Date(Number(ano), Number(m), 0).getDate()
        setForm({ data_inicio: `${ano}-${m}-01`, data_fim: `${ano}-${m}-${String(ultimoDia).padStart(2, "0")}`, dias_uteis: 21, regiao: "", status: "aberto" })
      }
      setLoading(false)
    })()
  }, [mes])

  const handleSave = async () => {
    try {
      await upsertPeriodo({ mes, ...form })
      toast.success("Período salvo!")
    } catch (err) {
      toast.error("Erro: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-600" />
          Configurações — Período
        </h1>
        <p className="text-muted-foreground">
          Substitui o objeto PERIODO fixo no código — cadastre aqui todo início de mês.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mês</CardTitle>
          <CardDescription>Selecione o mês que /equipe e as demais telas vão usar como &quot;mês atual&quot;.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input type="month" value={mes.slice(0, 7)} onChange={(e) => setMes(`${e.target.value}-01`)} className="w-40" />
        </CardContent>
      </Card>

      {!loading && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm(f => ({ ...f, data_fim: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dias úteis no mês</Label>
                <Input type="number" value={form.dias_uteis} onChange={(e) => setForm(f => ({ ...f, dias_uteis: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Região</Label>
                <Input value={form.regiao} onChange={(e) => setForm(f => ({ ...f, regiao: e.target.value }))} placeholder="Jundiaí" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as "aberto" | "fechado" }))}
                className="h-9 w-40 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="aberto">Aberto</option>
                <option value="fechado">Fechado</option>
              </select>
            </div>
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Salvar período</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
