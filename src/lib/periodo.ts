export function mesAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// Mês usado quando a tela abre sem ?mes= na URL. Fixo em agosto/2026 porque é
// o único período com dados carregados na base até o momento — trocar pra
// mesAtual() assim que a carga de dados acompanhar o mês corrente.
const MES_PADRAO = "2026-08-01";

/**
 * Resolve o mês vigente da tela a partir do ?mes= da URL (formato YYYY-MM),
 * caindo pro MES_PADRAO quando ausente ou inválido.
 */
export function resolveMes(mesParam?: string): string {
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) return `${mesParam}-01`;
  return MES_PADRAO;
}

// Anos usados no Comparativo Anual quando a tela abre sem ?anoA=/?anoB= na
// URL. Fixo em 2025 x 2026 pelo mesmo motivo do MES_PADRAO acima: nenhum dos
// dois tem base completa carregada ainda, mas é o par que faz sentido hoje —
// não é derivado do ano corrente porque a tela precisa continuar estável
// enquanto a carga de dados evolui.
const ANO_A_PADRAO = 2025;
const ANO_B_PADRAO = 2026;

/**
 * Resolve o par de anos do Comparativo Anual a partir de ?anoA=/?anoB= da
 * URL (formato YYYY), caindo pros padrões quando ausentes ou inválidos.
 */
export function resolveAnosComparativo(anoAParam?: string, anoBParam?: string): { anoA: number; anoB: number } {
  const anoA = anoAParam && /^\d{4}$/.test(anoAParam) ? Number(anoAParam) : ANO_A_PADRAO;
  const anoB = anoBParam && /^\d{4}$/.test(anoBParam) ? Number(anoBParam) : ANO_B_PADRAO;
  return { anoA, anoB };
}

const MESES_PT_BR = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Formata um mês (YYYY-MM ou YYYY-MM-DD) como "agosto de 2026", em vez do
 * "2026-08" cru, pra exibição nos títulos das telas analíticas.
 */
export function formatMes(mes: string): string {
  const [ano, mesNumero] = mes.slice(0, 7).split("-").map(Number);
  return `${MESES_PT_BR[mesNumero - 1]} de ${ano}`;
}
