import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requirePageAccess } from "@/lib/auth/permissions";

export default async function EvolucaoPage() {
  await requirePageAccess("evolucao");
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader ajuda="evolucao" title="Evolução por Cliente" subtitle="Histórico de compras mês a mês desde Jan/2024." />

      <Card>
        <CardHeader>
          <CardTitle>Fora do escopo da v1</CardTitle>
          <CardDescription>
            A aba EVOLUÇÃO da planilha tem histórico mensal por cliente desde Jan/2024. Importar esse volume
            retroativo ficou definido como fase 2, depois da v1 ser validada com o cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
            Em breve
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
