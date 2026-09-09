"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Seletor de mês reutilizável nas telas analíticas — troca o ?mes= na URL
 * (mantendo os demais filtros já aplicados) e a página server component relê
 * o período a partir dele via resolveMes(). Sem ?mes=, as telas caem no
 * MES_PADRAO (ver src/lib/periodo.ts).
 *
 * Usa <Select> em vez de <input type="month"> porque o picker nativo segue o
 * idioma do sistema/navegador (não o lang="pt-BR" da página), o que fazia a
 * interface aparecer em inglês pra quem tem o Chrome em outro idioma.
 */
export function MesFilter({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [ano, mesNumero] = mes.slice(0, 7).split("-").map(Number);

  const navigateToMes = (novoAno: number, novoMes: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", `${novoAno}-${String(novoMes).padStart(2, "0")}`);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const anos = Array.from(new Set([ano - 1, ano, ano + 1])).sort();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      Período
      <Select
        value={String(mesNumero)}
        onValueChange={(value) => navigateToMes(ano, Number(value))}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES_PT_BR.map((nome, idx) => (
            <SelectItem key={nome} value={String(idx + 1)}>
              {nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(ano)}
        onValueChange={(value) => navigateToMes(Number(value), mesNumero)}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
