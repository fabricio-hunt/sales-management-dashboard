import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, Users, DollarSign, Package, AlertCircle, Database } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { OverviewChart } from "@/components/dashboard/OverviewChart"

export const revalidate = 0 // Disable cache for this page so it always fetches fresh data

export default async function Dashboard() {
  // Fetch summary data from the View
  const { data: resumoData, error: resumoError } = await supabase
    .from('v_resumo_dashboard')
    .select('*')
    .single()

  // Fetch monthly sales data for the chart
  const { data: vendasPorMes, error: vendasError } = await supabase
    .from('v_vendas_por_mes')
    .select('*')

  // Se a view não existir, mostra a instrução para criar
  if (resumoError?.code === 'PGRST205' || vendasError?.code === 'PGRST205') {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-orange-800">Quase lá! Falta criar as Visões no Banco de Dados</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              O painel está pronto, mas o Supabase ainda não sabe como calcular os totais. 
              Copie o código SQL abaixo e execute no <a href="https://supabase.com/dashboard/projects" target="_blank" className="font-bold underline">SQL Editor do Supabase</a>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-md overflow-x-auto text-sm">
{`-- 1. Visão de Resumo (KPIs Principais)
CREATE OR REPLACE VIEW public.v_resumo_dashboard AS
SELECT
  COUNT(id) as total_pedidos,
  SUM(valor_venda_liquida) as faturamento_total,
  SUM(valor_compra) as custo_total,
  SUM(valor_venda_liquida - valor_compra) as lucro_total,
  COUNT(DISTINCT cliente_cnpj) as total_clientes
FROM public.pedidos;

-- 2. Visão de Evolução Mensal (Para o Gráfico)
CREATE OR REPLACE VIEW public.v_vendas_por_mes AS
SELECT
  TO_CHAR(data_documento, 'YYYY-MM') as mes,
  SUM(valor_venda_liquida) as faturamento
FROM public.pedidos
WHERE data_documento IS NOT NULL
GROUP BY TO_CHAR(data_documento, 'YYYY-MM')
ORDER BY mes;

-- Liberando acesso para as visões
GRANT SELECT ON public.v_resumo_dashboard TO anon, authenticated;
GRANT SELECT ON public.v_vendas_por_mes TO anon, authenticated;`}
            </pre>
            <p className="mt-4 text-sm text-orange-800 font-medium">
              Após rodar o script no Supabase, basta recarregar esta página. (Ctrl+R / F5)
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Formatting helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0)
  }

  const faturamento = resumoData?.faturamento_total || 0
  const pedidos = resumoData?.total_pedidos || 0
  const clientes = resumoData?.total_clientes || 0
  const lucro = resumoData?.lucro_total || 0
  
  // Margem = (Lucro / Faturamento) * 100
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Dados extraídos do Supabase</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(faturamento)}</div>
            <p className="text-xs text-muted-foreground">
              Total de vendas no período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pedidos Realizados</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(pedidos)}</div>
            <p className="text-xs text-muted-foreground">
              Volume total de notas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(clientes)}</div>
            <p className="text-xs text-muted-foreground">
              Base de clientes ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{margem.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Lucro sobre faturamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>
              Acompanhamento mensal de faturamento (R$).
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {vendasPorMes && vendasPorMes.length > 0 ? (
              <OverviewChart data={vendasPorMes} />
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                Nenhum dado de vendas encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
