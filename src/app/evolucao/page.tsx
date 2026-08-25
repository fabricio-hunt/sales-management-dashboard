import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function EvolucaoPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <LineChart className="w-7 h-7 text-indigo-400" />
          Evolução por Cliente
        </h1>
        <p className="text-slate-400 mt-1">Histórico de compras mês a mês desde Jan/2024.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fora do escopo da v1</CardTitle>
          <CardDescription>
            A aba EVOLUÇÃO da planilha tem histórico mensal por cliente desde Jan/2024. Importar esse volume
            retroativo ficou definido como fase 2, depois da v1 ser validada com o cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Em breve
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
