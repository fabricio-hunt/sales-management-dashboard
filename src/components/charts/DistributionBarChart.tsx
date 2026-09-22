"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface DistributionBarChartProps {
  data: { label: string; value: number; color?: string }[];
  format?: ValueFormat;
}

export function DistributionBarChart({ data, format = "number" }: DistributionBarChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={tokens.colors.border} />
        <XAxis
          dataKey="label"
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
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
          formatter={(value, name) => [fmt(Number(value)), String(name)]}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.colors.border}`,
            fontSize: 12,
            boxShadow: tokens.shadow.card,
          }}
          cursor={{ fill: tokens.colors.background }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={entry.color ?? tokens.colors.chartPalette[i % tokens.colors.chartPalette.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => fmt(Number(v))}
            fontSize={11}
            fill={tokens.colors.textSecondary}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
