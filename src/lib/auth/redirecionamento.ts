// Valida destino de redirect vindo de parametro controlavel pelo usuario
// (?next= no /login, campo "proximo" em /conta e /trocar-senha).
//
// A guarda anterior era `valor.startsWith("/")`, que NAO basta: "//evil.com"
// comeca com "/" e e uma URL protocolo-relativa — o browser resolve como
// https://evil.com. Isso permitia montar
// https://<dominio-real>/login?next=//site-falso: a vitima ve o dominio
// legitimo, autentica e e jogada para fora. Redirect aberto classico, usado
// para phishing justamente porque o link inicial e verdadeiro.
//
// A variante com barra invertida ("/" seguido de "\") tem o mesmo efeito:
// varios browsers normalizam a barra invertida para "/" antes de resolver.

// Sem regex de propósito: escrever a classe de caracteres de controle como
// literal deixa bytes invisiveis no fonte. Comparar o code point e explicito.
function temCaractereDeControle(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

export function caminhoInternoSeguro(valor: unknown, padrao = "/"): string {
  if (typeof valor !== "string") return padrao;

  const v = valor.trim();

  // Precisa ser caminho absoluto interno.
  if (!v.startsWith("/")) return padrao;

  // Bloqueia protocolo-relativo ("//host") e a variante com barra invertida.
  if (v.startsWith("//") || v.startsWith("/\\")) return padrao;

  // Caracteres de controle podem quebrar o header Location.
  if (temCaractereDeControle(v)) return padrao;

  return v;
}
