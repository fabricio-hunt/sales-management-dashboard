export type ComissaoFaixa = {
  pct_atingimento_min: number;
  pct_atingimento_max: number | null;
  modo: "proporcional" | "fator_fixo";
  fator: number;
};

// baseRealizado × premiacaoPct × fator da faixa que contém pctAtingimento.
// "proporcional": o fator escala com o próprio % de atingimento (ex: 80% de
// atingimento numa faixa proporcional paga 80% do prêmio da faixa).
// "fator_fixo": paga o fator cheio da faixa, independente de onde dentro dela
// o atingimento caiu (ex: "Acima de 100%" costuma ser fator_fixo).
export function calcularComissao({
  baseRealizado,
  premiacaoPct,
  pctAtingimento,
  faixas,
}: {
  baseRealizado: number;
  premiacaoPct: number;
  pctAtingimento: number;
  faixas: ComissaoFaixa[];
}): number {
  const faixa = faixas.find(
    (f) =>
      pctAtingimento >= f.pct_atingimento_min &&
      (f.pct_atingimento_max == null || pctAtingimento < f.pct_atingimento_max)
  );
  if (!faixa) return 0;

  const fatorEfetivo = faixa.modo === "proporcional" ? (pctAtingimento / 100) * faixa.fator : faixa.fator;
  return baseRealizado * premiacaoPct * fatorEfetivo;
}
