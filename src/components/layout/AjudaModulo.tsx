"use client";

import { useEffect, useRef } from "react";
import { HelpCircle, ChevronDown, Info, AlertTriangle, Database } from "lucide-react";
import { AJUDA } from "@/lib/ajuda/conteudo";

// Ajuda contextual da tela: discreta quando fechada, ensinando quando aberta.
//
// Usa <details>/<summary> nativo em vez de estado em React. Duas razões:
// acessibilidade sai de graça (o elemento já anuncia expandido/recolhido e
// responde ao teclado), e a preferência salva pode ser restaurada mutando o
// DOM num efeito, sem chamar setState — que é justamente o que a regra
// react-hooks/set-state-in-effect proíbe.
//
// A escolha de aberto/fechado fica em localStorage por slug: quem já aprendeu a
// tela não precisa fechar o painel toda vez. Por padrão vem FECHADO, pra ajuda
// nunca empurrar o conteúdo real da tela pra baixo da dobra.
//
// localStorage lança em janela anônima e com cookies bloqueados, então toda
// leitura e escrita é protegida — falhar aqui não pode derrubar a página.

const PREFIXO = "ajuda:";

export function AjudaModulo({ slug }: { slug: string }) {
  const conteudo = AJUDA[slug];
  const ref = useRef<HTMLDetailsElement>(null);

  // Restaura a preferência depois da montagem. Mutação de DOM, não estado:
  // o HTML do servidor e o do primeiro render do cliente continuam idênticos.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PREFIXO + slug) === "aberto" && ref.current) {
        ref.current.open = true;
      }
    } catch {
      /* sem persistência é aceitável; a tela continua funcionando */
    }
  }, [slug]);

  if (!conteudo) return null;

  const aoAlternar = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    try {
      window.localStorage.setItem(PREFIXO + slug, e.currentTarget.open ? "aberto" : "fechado");
    } catch {
      /* idem */
    }
  };

  return (
    <details ref={ref} onToggle={aoAlternar} className="group mt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md -ml-2 px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <HelpCircle className="h-4 w-4" aria-hidden />
        Como usar esta tela
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
        <p className="text-foreground">{conteudo.resumo}</p>

        {conteudo.passos.length > 0 && (
          <ul className="space-y-1.5 text-muted-foreground">
            {conteudo.passos.map((passo, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                <span>{passo}</span>
              </li>
            ))}
          </ul>
        )}

        {conteudo.fonte && (
          <p className="flex gap-2 text-muted-foreground">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-medium text-foreground">De onde vem: </span>
              {conteudo.fonte}
            </span>
          </p>
        )}

        {conteudo.atencao && (
          <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{conteudo.atencao}</span>
          </p>
        )}

        <p className="flex gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            O passo a passo completo do sistema está no{" "}
            <a href="/docs" className="underline">
              Manual de Uso
            </a>
            .
          </span>
        </p>
      </div>
    </details>
  );
}
