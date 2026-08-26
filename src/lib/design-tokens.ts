// Fonte única dos tokens visuais do dashboard. As mesmas cores estão espelhadas
// em `src/app/globals.css` (custom properties) para uso em classes Tailwind —
// este arquivo existe pra contextos que precisam do valor bruto em JS, como as
// paletas dos gráficos Recharts (que não aceitam var(--...) de forma confiável
// em todos os export paths).
export const tokens = {
  colors: {
    background: "#F8F9FB",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    accent: "#2563EB",
    positive: "#16A34A",
    negative: "#DC2626",
    neutral: "#9CA3AF",
    chartPalette: ["#2563EB", "#0EA5E9", "#8B5CF6", "#F59E0B", "#10B981"],
  },
  radius: { card: "12px", input: "8px", pill: "999px" },
  shadow: { card: "0 1px 2px rgba(16,24,40,0.05)" },
  spacing: { pageGutter: "24px", cardGap: "16px" },
} as const;
