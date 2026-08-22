import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookOpen, CheckCircle2, Rocket, Database, Code, Lightbulb } from "lucide-react"

export default function DocsPage() {
  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentação & Pitch</h1>
          <p className="text-muted-foreground mt-2">
            Área de apoio para reuniões comerciais e acompanhamento do produto.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tecnologias */}
        <Card className="md:col-span-2 border-blue-100 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-blue-600" />
              <CardTitle>Nossa Arquitetura (O que falar para o cliente)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed">
              O <strong>Commercial Management Dashboard</strong> é construído com as tecnologias mais modernas do mercado (A mesma base usada por gigantes tech). Utilizamos <strong>Next.js (React)</strong> para uma interface extremamente rápida e responsiva. No backend, nossa base de dados está hospedada no <strong>Supabase (PostgreSQL)</strong>, que garante segurança de dados a nível empresarial, escalabilidade para milhões de registros e performance ultra-rápida (buscas em milissegundos).
            </p>
          </CardContent>
        </Card>

        {/* O que já temos */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <CardTitle>Funcionalidades Entregues (MVP)</CardTitle>
            </div>
            <CardDescription>O que o sistema já faz hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex gap-2 text-sm">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Ingestão de Dados Massivos:</strong> Motor capaz de ler e processar dezenas de milhares de registros via planilhas pesadas (ex: 50 mil+ linhas).</span>
              </li>
              <li className="flex gap-2 text-sm">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Mapeamento Automático:</strong> Resolução de nomenclaturas (VDA LIQ, Valor Venda, Cliente) ignorando cabeçalhos sujos das extrações de ERP.</span>
              </li>
              <li className="flex gap-2 text-sm">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Painel Executivo (Visão Geral):</strong> Cálculo instantâneo de Faturamento, Lucro Líquido, Margem e contagem de clientes (Unique).</span>
              </li>
              <li className="flex gap-2 text-sm">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Gráficos de Evolução:</strong> Curva de crescimento e faturamento mês a mês em tempo real.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* O que foi descoberto na Planilha */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <CardTitle>Descoberta de Dados (Data Mining)</CardTitle>
            </div>
            <CardDescription>Colunas mapeadas que geram muito valor</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 mb-4">Durante o processo de mapeamento do banco, identificamos colunas chave na planilha que nos permitem construir visões profundas:</p>
            <ul className="space-y-3">
              <li className="flex flex-col gap-1 text-sm border-b pb-2">
                <strong>[ Representante ] & [ Supervisor ]</strong>
                <span className="text-muted-foreground text-xs">Permite criarmos comissões, rankings de vendas e metas por equipe.</span>
              </li>
              <li className="flex flex-col gap-1 text-sm border-b pb-2">
                <strong>[ Cond. Pagto ] & [ Tipo Doc ]</strong>
                <span className="text-muted-foreground text-xs">Abre portas para painéis financeiros de previsibilidade de caixa (Contas a Receber).</span>
              </li>
              <li className="flex flex-col gap-1 text-sm border-b pb-2">
                <strong>[ Ramo ] & [ Fornecedor ]</strong>
                <span className="text-muted-foreground text-xs">Podemos fazer análise de Pareto (Curva ABC). Ex: Qual ramo (Supermercado vs Farmácia) traz mais lucro?</span>
              </li>
              <li className="flex flex-col gap-1 text-sm">
                <strong>[ Transação ] (Devolução)</strong>
                <span className="text-muted-foreground text-xs">Possibilita rastrear produtos com alto índice de logística reversa ou defeito.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Próximos Passos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <CardTitle>Roadmap & Próximos Passos (Melhorias Futuras)</CardTitle>
            </div>
            <CardDescription>Ofereça essas expansões para seus clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Rocket className="w-4 h-4" /> Módulo Comercial
                </h3>
                <p className="text-sm text-muted-foreground">
                  Criação do Ranking de Representantes (Top Performers), análise de atingimento de metas e performance de positivação (novos clientes abertos).
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Rocket className="w-4 h-4" /> Módulo de Produtos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Análise de Curva ABC de produtos e marcas parceiras (Fornecedores). Quais itens dão mais lucro real vs maior volume logístico?
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Rocket className="w-4 h-4" /> Dashboards Dinâmicos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Adição de filtros globais de período (Data Inicial/Final), Estado (UF), e Empresa, permitindo que a diretoria cruze qualquer dado em tempo real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
