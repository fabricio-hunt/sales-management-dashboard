import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl motion-safe:animate-[float-blob_9s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-chart-4/10 blur-3xl motion-safe:animate-[float-blob_11s_ease-in-out_infinite]"
        style={{ animationDelay: "1.2s" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <svg
          aria-hidden
          viewBox="0 0 260 230"
          className="h-48 w-auto sm:h-56"
        >
          {/* tomada na parede */}
          <rect x="80" y="8" width="100" height="128" rx="20" className="fill-card stroke-border" strokeWidth="2" />
          <rect x="108" y="38" width="11" height="30" rx="5" className="fill-muted-foreground/35" />
          <rect x="141" y="38" width="11" height="30" rx="5" className="fill-muted-foreground/35" />
          <circle cx="130" cy="96" r="7" className="fill-muted-foreground/35" />

          {/* fio + plugue balançando, desconectado */}
          <g
            className="motion-safe:animate-[swing-plug_3.4s_ease-in-out_infinite]"
            style={{ transformOrigin: "130px 138px" }}
          >
            <path
              d="M130,138 C154,158 100,166 122,186 C138,200 92,196 84,208"
              fill="none"
              className="stroke-muted-foreground/45"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect x="61" y="184" width="6" height="16" rx="3" className="fill-muted-foreground/60" />
            <rect x="82" y="184" width="6" height="16" rx="3" className="fill-muted-foreground/60" />
            <rect x="52" y="196" width="44" height="28" rx="9" className="fill-card stroke-border" strokeWidth="2" />

            {/* faíscas do plugue desconectado */}
            <path
              d="M64 180 l4 -10 l3 6 l5 -8 l-3 11 l-3 -5 z"
              className="fill-chart-4 motion-safe:animate-[spark-flicker_2.6s_ease-in-out_infinite]"
              style={{ transformOrigin: "66px 175px" }}
            />
            <path
              d="M86 180 l4 -10 l3 6 l5 -8 l-3 11 l-3 -5 z"
              className="fill-chart-4 motion-safe:animate-[spark-flicker_2.6s_ease-in-out_infinite]"
              style={{ transformOrigin: "88px 175px", animationDelay: "1.1s" }}
            />
          </g>
        </svg>

        <div className="space-y-2">
          <p className="text-7xl font-bold tracking-tight text-foreground sm:text-8xl">
            4<span className="text-primary">0</span>4
          </p>
          <h1 className="text-xl font-semibold text-foreground">Essa página está desconectada</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            O endereço que você tentou acessar não existe ou foi movido. Vamos te levar de volta pra um lugar
            conectado.
          </p>
        </div>

        <Button render={<Link href="/" />} nativeButton={false}>
          <Home className="w-4 h-4 mr-1.5" /> Voltar para o início
        </Button>
      </div>
    </div>
  );
}
