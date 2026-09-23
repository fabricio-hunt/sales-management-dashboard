"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface TrendBarChartProps {
  // `color` por item é opcional — quando ausente, cicla pela paleta de gráficos
  // (mesmo padrão de CategoryBarChart/DistributionBarChart). Pedido do cliente:
  // nada de cor uniforme, e o valor precisa aparecer sem precisar passar o mouse.
  data: { label: string; value: number; color?: string }[];
  format?: ValueFormat;
  color?: string;
}

export function TrendBarChart({ data, format = "number", color }: TrendBarChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={tokens.colors.border} />
        <XAxis
          dataKey="label"
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => fmt(v)}
          width={72}
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
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={18}>
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={entry.color ?? color ?? tokens.colors.chartPalette[i % tokens.colors.chartPalette.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => fmt(Number(v))}
            fontSize={9}
            fill={tokens.colors.textSecondary}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
