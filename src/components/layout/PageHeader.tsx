import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AjudaModulo } from "./AjudaModulo";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  /**
   * Slug do módulo (mesmo de modulos.slug) para exibir a ajuda contextual
   * "Como usar esta tela" abaixo do cabeçalho. O texto fica em
   * src/lib/ajuda/conteudo.ts; slug sem verbete simplesmente não renderiza nada.
   */
  ajuda?: string;
}

export function PageHeader({ title, subtitle, backHref, backLabel, actions, ajuda }: PageHeaderProps) {
  return (
    <div className="border-b border-border pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel ?? "Voltar"}
            </Link>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {ajuda && <AjudaModulo slug={ajuda} />}
    </div>
  );
}
