import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Undo2,
  Trophy,
  DollarSign,
  Package,
  LineChart,
  Users,
  Settings,
  Upload,
  ArrowRight
} from "lucide-react";

export default function DashboardHub() {
  const analiticos = [
    { title: "Ranking Positivação", href: "/rankings/positivacao", icon: Trophy, color: "text-amber-500", desc: "Top clientes positivados" },
    { title: "Ranking Financeiro", href: "/rankings/financeiro", icon: DollarSign, color: "text-emerald-500", desc: "Top clientes em faturamento" },
    { title: "Resumo Distribuição", href: "/distribuicao", icon: Package, color: "text-blue-500", desc: "Distribuição de produtos" },
    { title: "Evolução por Cliente", href: "/evolucao", icon: LineChart, color: "text-indigo-500", desc: "Histórico de compras" },
    { title: "Analítico de Vendas", href: "/analitico/vendas", icon: BarChart3, color: "text-cyan-500", desc: "Extrato detalhado por nota" },
    { title: "Faturamento Dia", href: "/analitico/faturamento-dia", icon: TrendingUp, color: "text-violet-500", desc: "Vendas diárias" },
    { title: "Analítico Cliente", href: "/analitico/cliente", icon: PieChart, color: "text-pink-500", desc: "Vendas e devoluções diárias" },
    { title: "Devoluções de Vendas", href: "/analitico/devolucoes", icon: Undo2, color: "text-red-500", desc: "Motivos de devolução" },
  ];

  const resultados = [
    { title: "Geral Empresa", href: "/", icon: LayoutDashboard, color: "text-slate-700", desc: "Consolidado total (Em breve)" },
    { title: "Equipes / RPAs", href: "/equipe", icon: Users, color: "text-blue-600", desc: "Desempenho por vendedor" },
  ];

  const interno = [
    { title: "Atualizar Dados", href: "/admin/importar", icon: Upload, color: "text-slate-500", desc: "Importar novas planilhas" },
    { title: "Configurações", href: "/configuracoes", icon: Settings, color: "text-slate-500", desc: "Ajustes do sistema" },
  ];

  // Helper component for the hub links
  const HubCard = ({ item }: { item: { title: string; href: string; icon: React.ElementType; color: string; desc: string } }) => (
    <Link href={item.href} className="block group">
      <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-blue-200 hover:-translate-y-1">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-100 group-hover:bg-blue-50 transition-colors ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Resumo Geral</h1>
        <p className="text-slate-500">
          Selecione um dos painéis abaixo para visualizar os indicadores comerciais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna 1: Dados Analíticos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">Dados Analíticos</h2>
          </div>
          <div className="grid gap-3">
            {analiticos.map((item, idx) => <HubCard key={idx} item={item} />)}
          </div>
        </div>

        {/* Coluna 2: Resultado de Vendas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">Resultado de Vendas</h2>
          </div>
          <div className="grid gap-3">
            {resultados.map((item, idx) => <HubCard key={idx} item={item} />)}
          </div>
        </div>

        {/* Coluna 3: Uso Interno */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800">Uso Interno</h2>
          </div>
          <div className="grid gap-3">
            {interno.map((item, idx) => <HubCard key={idx} item={item} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
// Temporary import just for the layout icon above
import { LayoutDashboard } from "lucide-react";
