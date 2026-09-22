"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tokens } from "@/lib/design-tokens";
import { formatValue, type ValueFormat } from "@/lib/format-value";

interface YearComparisonChartProps {
  data: { mes: string; anoA: number | null; anoB: number | null }[];
  anoALabel: string;
  anoBLabel: string;
  format?: ValueFormat;
}

// Única diferença estrutural em relação a um gráfico de barra simples: duas
// séries lado a lado por mês. Um mês sem dado (null, mês que ainda não
// chegou) simplesmente não desenha barra — diferente de 0 (mês que aconteceu
// e não vendeu nada), que desenha uma barra de altura zero.
export function YearComparisonChart({ data, anoALabel, anoBLabel, format = "currency-compact" }: YearComparisonChartProps) {
  const fmt = (v: number) => formatValue(v, format);
  const corA = tokens.colors.chartPalette[0];
  const corB = tokens.colors.chartPalette[1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          cursor={{ fill: tokens.colors.background }}
        />
        <Legend
          formatter={(value) => (value === "anoA" ? anoALabel : anoBLabel)}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="anoA" name="anoA" fill={corA} radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="anoB" name="anoB" fill={corB} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
