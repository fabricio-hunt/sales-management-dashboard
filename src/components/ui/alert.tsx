import * as React from "react"
import { AlertTriangle, Info, Lock, CheckCircle2 } from "lucide-react"

// Aviso de uso na própria tela. Existe porque várias telas dependem de um
// pré-requisito (importar a base, cadastrar meta, o Manager atribuir
// representantes) e, sem isso, apareciam vazias ou com número placeholder sem
// explicar o porquê — o usuário concluía que o sistema estava quebrado.
//
// variant:
//   info      — contexto neutro, "como usar esta tela"
//   aviso     — o dado existe mas não é confiável ainda (ex: comissão placeholder)
//   bloqueio  — falta um pré-requisito; a ação não está disponível e o texto diz de quem é a vez
//   ok        — confirmação de estado saudável

type Variant = "info" | "aviso" | "bloqueio" | "ok"

const STYLES: Record<Variant, { wrap: string; icon: string; Icon: React.ElementType }> = {
  info: {
    wrap: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    Icon: Info,
  },
  aviso: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  bloqueio: {
    wrap: "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
    icon: "text-slate-500 dark:text-slate-400",
    Icon: Lock,
  },
  ok: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
}

export function Alert({
  variant = "info",
  titulo,
  children,
  className = "",
}: {
  variant?: Variant
  titulo?: string
  children: React.ReactNode
  className?: string
}) {
  const { wrap, icon, Icon } = STYLES[variant]
  return (
    <div role="note" className={`flex gap-3 rounded-lg border p-4 ${wrap} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden />
      <div className="space-y-1 text-sm leading-relaxed">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className="[&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs dark:[&_code]:bg-white/10">
          {children}
        </div>
      </div>
    </div>
  )
}
