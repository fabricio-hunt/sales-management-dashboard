import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function ComercialPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Comercial</h1>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <CardTitle>Desempenho da Equipe</CardTitle>
          </div>
          <CardDescription>
            Acompanhe o desempenho dos representantes e clientes.
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
