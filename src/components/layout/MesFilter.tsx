"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

/**
 * Seletor de mês reutilizável nas telas analíticas — troca o ?mes= na URL
 * (mantendo os demais filtros já aplicados) e a página server component relê
 * o período a partir dele via resolveMes(). Sem ?mes=, as telas caem no mês
 * atual (mesmo comportamento de antes desse filtro existir).
 */
export function MesFilter({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Período
      <Input
        type="month"
        value={mes.slice(0, 7)}
        onChange={(e) => handleChange(e.target.value)}
        className="w-40"
      />
    </label>
  );
}
