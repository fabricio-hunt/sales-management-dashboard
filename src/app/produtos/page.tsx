import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function ProdutosPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <CardTitle>Análise de Produtos</CardTitle>
          </div>
          <CardDescription>
            Acompanhe o volume de vendas por produto e margem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Módulo em desenvolvimento...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
