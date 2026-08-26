import { PageHeader } from "@/components/layout/PageHeader";

export default function LançarVendasPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Lançamento de Vendas"
        subtitle="Cadastre vendas avulsas manualmente sem depender do envio de planilhas."
      />
      <div className="border border-border rounded-xl p-6 bg-card text-card-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Módulo em construção (Formulário de Lançamento Avulso)</p>
      </div>
    </div>
  );
}
