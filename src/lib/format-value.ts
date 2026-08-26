// Charts are client components but the pages feeding them data are server
// components — functions can't cross that boundary as props, so callers pass
// this string discriminator instead of an Intl formatter closure.
export type ValueFormat = "number" | "currency" | "currency-compact" | "percent";

export function formatValue(value: number, format: ValueFormat): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    case "currency-compact":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString("pt-BR");
  }
}
