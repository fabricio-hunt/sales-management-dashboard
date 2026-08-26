"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface TrendLineChartProps {
  data: { label: string; value: number }[];
  format?: ValueFormat;
  color?: string;
}

export function TrendLineChart({ data, format = "number", color = tokens.colors.accent }: TrendLineChartProps) {
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          cursor={{ stroke: tokens.colors.border }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
