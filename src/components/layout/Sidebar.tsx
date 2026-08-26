"use client";
import Link from "next/link";
import Image from "next/image";
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
  Menu,
  X,
  Target,
  Truck,
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
        { href: "/produtos", label: "Curva ABC de Produtos", icon: BarChart3 },
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
        { href: "/admin/metas", label: "Metas por Fornecedor", icon: Target },
        { href: "/admin/fornecedores", label: "Fornecedores", icon: Truck },
        { href: "/admin/vendas", label: "Lançar Venda", icon: DollarSign },
        { href: "/admin/clientes", label: "Gestão Clientes", icon: Users },
        { href: "/admin/representantes", label: "Gestão Equipe", icon: Users },
        { href: "/configuracoes", label: "Configurações", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card shrink-0 z-40 relative">
        <Link href="/">
          <Image
            src="/logo.jpg"
            alt="Avante Distribuição"
            width={40}
            height={40}
            className="object-cover rounded-full"
          />
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col h-screen shrink-0`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Avante Distribuição"
              width={32}
              height={32}
              className="object-cover rounded-full"
            />
            <span className="text-sm font-semibold text-foreground">Avante</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {menuGroups.map((group, index) => (
            <div key={index}>
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group text-sm ${isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors ${isActive ? "text-accent-foreground" : "group-hover:text-foreground"}`}
                      />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Administrador</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
