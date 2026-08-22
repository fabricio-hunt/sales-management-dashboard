"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface OverviewChartProps {
  data: {
    mes: string;
    faturamento: number;
  }[]
}

export function OverviewChart({ data }: OverviewChartProps) {
  // Format the month (e.g. "2026-08" -> "Ago")
  const formatMonth = (mes: string) => {
    if (!mes) return ""
    const [year, month] = mes.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  }

  const formattedData = data.map(d => ({
    name: formatMonth(d.mes),
    total: d.faturamento
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formattedData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Faturamento']}
          cursor={{fill: '#f1f5f9'}}
        />
        <Bar
          dataKey="total"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
