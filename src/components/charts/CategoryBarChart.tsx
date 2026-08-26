"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface CategoryBarChartProps {
  data: { label: string; value: number }[];
  format?: ValueFormat;
  color?: string;
}

const truncate = (label: string, max = 20) => (label.length > max ? `${label.slice(0, max - 1)}…` : label);

export function CategoryBarChart({ data, format = "number", color = tokens.colors.accent }: CategoryBarChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
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
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
