import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; direction: "up" | "down" };
  hint?: string;
  icon?: ReactNode;
}

export function KpiCard({ label, value, delta, hint, icon }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {delta && (
          <span className={delta.direction === "up" ? "text-sm font-medium text-positive" : "text-sm font-medium text-negative"}>
            {delta.direction === "up" ? "▲" : "▼"} {Math.abs(delta.value).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
