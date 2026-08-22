"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart3,
  Settings,
  BookOpen,
  PieChart,
  TrendingUp,
  Undo2,
  Trophy,
  DollarSign,
  Package,
  LineChart,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const menuGroups = [
    {
      title: "Dashboard",
      links: [
        { href: "/", label: "Resumo Geral", icon: LayoutDashboard },
        { href: "/equipe", label: "Visão Equipe (RPA)", icon: Users },
      ],
    },
    {
      title: "Dados Analíticos",
      links: [
        { href: "/analitico/vendas", label: "Analítico de Vendas", icon: BarChart3 },
        { href: "/analitico/cliente", label: "Analítico Cliente", icon: PieChart },
        { href: "/analitico/faturamento-dia", label: "Faturamento Diário", icon: TrendingUp },
        { href: "/analitico/devolucoes", label: "Devoluções", icon: Undo2 },
      ],
    },
    {
      title: "Rankings",
      links: [
        { href: "/rankings/positivacao", label: "Ranking Positivação", icon: Trophy },
        { href: "/rankings/financeiro", label: "Ranking Financeiro", icon: DollarSign },
      ],
    },
    {
      title: "Distribuição & Evolução",
      links: [
        { href: "/distribuicao", label: "Resumo Distribuição", icon: Package },
        { href: "/evolucao", label: "Evolução por Cliente", icon: LineChart },
      ],
    },
    {
      title: "Uso Interno",
      links: [
        { href: "/admin/importar", label: "Importar Base", icon: Upload },
        { href: "/admin/vendas", label: "Lançar Venda", icon: DollarSign },
        { href: "/admin/clientes", label: "Gestão Clientes", icon: Users },
        { href: "/admin/representantes", label: "Gestão Equipe", icon: Users },
        { href: "/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 flex flex-col h-screen border-r bg-background shrink-0">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
          Avante
          <br />
          Distribuição
        </h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {menuGroups.map((group, index) => (
          <div key={index}>
            <p className="px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm ${isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${isActive ? "text-blue-600" : "group-hover:text-slate-900"}`}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t shrink-0 bg-slate-50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">Administrador</span>
            <span className="text-xs text-slate-500">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
