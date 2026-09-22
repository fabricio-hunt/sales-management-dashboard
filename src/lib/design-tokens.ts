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
    // Ordem fixa, validada para separação sob daltonismo (protanopia/tritanopia) nos
    // pares adjacentes — nunca reordenar nem ciclar para atribuir identidade (ex.: cor
    // de equipe). Cabe até 8 categorias; a partir da 9ª, agrupar em "Outros" ou usar
    // small multiples em vez de gerar uma nova cor.
    chartPalette: [
      "#2a78d6", // 1 azul
      "#eb6834", // 2 laranja
      "#1baf7a", // 3 verde-água
      "#eda100", // 4 amarelo
      "#e87ba4", // 5 magenta
      "#008300", // 6 verde
      "#4a3aa7", // 7 violeta
      "#e34948", // 8 vermelho
    ],
  },
  radius: { card: "12px", input: "8px", pill: "999px" },
  shadow: { card: "0 1px 2px rgba(16,24,40,0.05)" },
  spacing: { pageGutter: "24px", cardGap: "16px" },
} as const;
