export function mesAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Resolve o mês vigente da tela a partir do ?mes= da URL (formato YYYY-MM),
 * caindo pro mês atual quando ausente ou inválido.
 */
export function resolveMes(mesParam?: string): string {
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) return `${mesParam}-01`;
  return mesAtual();
}
