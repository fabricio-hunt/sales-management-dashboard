"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface YearComparisonChartProps {
  data: { mes: string; anoA: number | null; anoB: number | null }[];
  anoALabel: string;
  anoBLabel: string;
  format?: ValueFormat;
}

// Única diferença estrutural em relação a TrendLineChart: duas séries em vez
// de uma. connectNulls={false} nas duas Area é o que faz um mês sem dado
// aparecer como lacuna real no traçado, em vez de um vale de zero enganoso —
// a página decide o que é null (mês que ainda não chegou) vs 0 (mês que
// aconteceu e não vendeu nada).
export function YearComparisonChart({ data, anoALabel, anoBLabel, format = "currency-compact" }: YearComparisonChartProps) {
  const fmt = (v: number) => formatValue(v, format);
  const corA = tokens.colors.chartPalette[0];
  const corB = tokens.colors.chartPalette[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAnoA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={corA} stopOpacity={0.18} />
            <stop offset="100%" stopColor={corA} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillAnoB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={corB} stopOpacity={0.18} />
            <stop offset="100%" stopColor={corB} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={tokens.colors.border} />
        <XAxis
          dataKey="mes"
          stroke={tokens.colors.textSecondary}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={12}
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
          formatter={(value, name) => [
            value == null ? "sem dados" : fmt(Number(value)),
            name === "anoA" ? anoALabel : anoBLabel,
          ]}
          contentStyle={{
            borderRadius: 8,
            border: `1px solid ${tokens.colors.border}`,
            fontSize: 12,
            boxShadow: tokens.shadow.card,
          }}
          cursor={{ stroke: tokens.colors.border }}
        />
        <Legend
          formatter={(value) => (value === "anoA" ? anoALabel : anoBLabel)}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="anoA"
          name="anoA"
          stroke={corA}
          strokeWidth={2}
          fill="url(#fillAnoA)"
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="anoB"
          name="anoB"
          stroke={corB}
          strokeWidth={2}
          fill="url(#fillAnoB)"
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
