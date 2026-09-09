"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Seletor de dois anos pro Comparativo Anual — troca ?anoA=/?anoB= na URL
 * (mantendo os demais filtros já aplicados), mesma mecânica do MesFilter.
 *
 * As opções vão de anoAtual-4 até anoAtual+1 de propósito: inclui anos sem
 * nenhum dado carregado, porque não é papel do filtro decidir quais anos são
 * "prováveis" — a página é que trata o lado vazio da comparação.
 */
export function AnoCompareFilter({ anoA, anoB }: { anoA: number; anoB: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = (novoA: number, novoB: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("anoA", String(novoA));
    params.set("anoB", String(novoB));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const anoAtual = new Date().getFullYear();
  const opcoes = Array.from({ length: 6 }, (_, i) => anoAtual + 1 - i);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      Comparar
      <Select value={String(anoA)} onValueChange={(value) => navigate(Number(value), anoB)}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      vs
      <Select value={String(anoB)} onValueChange={(value) => navigate(anoA, Number(value))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
