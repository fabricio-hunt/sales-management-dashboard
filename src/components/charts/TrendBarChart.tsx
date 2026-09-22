"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface TrendBarChartProps {
  data: { label: string; value: number }[];
  format?: ValueFormat;
  color?: string;
}

export function TrendBarChart({ data, format = "number", color = tokens.colors.accent }: TrendBarChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
