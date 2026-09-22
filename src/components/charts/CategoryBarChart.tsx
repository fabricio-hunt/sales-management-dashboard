"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface CategoryBarChartProps {
  // `color` por item é opcional — quando ausente, cicla pela paleta de gráficos
  // (mesmo padrão do DistributionBarChart). `color` (prop única) força a mesma
  // cor em todas as barras, para os casos onde monocromático ainda faz sentido.
  data: { label: string; value: number; color?: string }[];
  format?: ValueFormat;
  color?: string;
}

const truncate = (label: string, max = 20) => (label.length > max ? `${label.slice(0, max - 1)}…` : label);

export function CategoryBarChart({ data, format = "number", color }: CategoryBarChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={tokens.colors.border} />
        <XAxis
          type="number"
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmt(v)}
        />
        <YAxis
          type="category"
          dataKey="label"
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={132}
          tickFormatter={(v: string) => truncate(v)}
        />
        <Tooltip
          formatter={(value) => [fmt(Number(value)), "Valor"]}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.colors.border}`,
            fontSize: 12,
            boxShadow: tokens.shadow.card,
          }}
          cursor={{ fill: tokens.colors.background }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry, i) => (
            <Cell
              key={entry.label}
              fill={entry.color ?? color ?? tokens.colors.chartPalette[i % tokens.colors.chartPalette.length]}
            />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => fmt(Number(v))}
            fontSize={11}
            fill={tokens.colors.textSecondary}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
