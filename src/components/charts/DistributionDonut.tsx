"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface DistributionDonutProps {
  data: { label: string; value: number; color?: string }[];
  format?: ValueFormat;
}

export function DistributionDonut({ data, format = "number" }: DistributionDonutProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="90%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={entry.color ?? tokens.colors.chartPalette[i % tokens.colors.chartPalette.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [fmt(Number(value)), String(name)]}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.colors.border}`,
            fontSize: 12,
            boxShadow: tokens.shadow.card,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
