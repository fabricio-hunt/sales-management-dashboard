import type { ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import { EmptyState } from "@/components/data-display/EmptyState";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  isLoading,
  isEmpty,
  emptyMessage = "Sem dados suficientes para este período",
  error,
  onRetry,
  children,
}: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="mb-4">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-negative">
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Tentar de novo
            </button>
          )}
        </div>
      ) : isEmpty ? (
        <EmptyState message={emptyMessage} className="h-64" />
      ) : (
        <div className="h-64">{children}</div>
      )}
    </div>
  );
}
