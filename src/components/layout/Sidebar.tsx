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
  ShieldCheck,
  UserCog,
  Percent,
  LogOut,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/auth/session";
import type { PermissoesResolvidas } from "@/lib/auth/permissions";

const ROLE_LABEL: Record<Profile["role"], string> = {
  manager: "Manager",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

export function Sidebar({
  profile,
  permissoes,
}: {
  profile: Profile;
  permissoes: PermissoesResolvidas | null; // null = manager, tudo liberado
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // slug = mesmo identificador da coluna modulos.slug/permissoes_role.modulo_slug
  // (ver supabase_migration_v2.sql) — link só aparece se o usuário tiver ao
  // menos "visualizar" nesse módulo.
  const menuGroups = [
    {
      title: "Dashboard",
      links: [
        { href: "/", label: "Resumo Geral", icon: LayoutDashboard, slug: "dashboard" },
        { href: "/admin/vendas", label: "Lançar Venda", icon: DollarSign, slug: "admin.vendas" },
        { href: "/equipe", label: "Visão Equipe (RPA)", icon: Users, slug: "equipe" },
        { href: "/comissoes", label: "Comissão/Premiação", icon: Percent, slug: "comissoes" },
      ],
    },
    {
      title: "Dados Analíticos",
      links: [
        { href: "/analitico/vendas", label: "Analítico de Vendas", icon: BarChart3, slug: "analitico.vendas" },
        { href: "/analitico/cliente", label: "Analítico Cliente", icon: PieChart, slug: "analitico.cliente" },
        { href: "/analitico/faturamento-dia", label: "Faturamento Diário", icon: TrendingUp, slug: "analitico.faturamento_dia" },
        { href: "/analitico/devolucoes", label: "Devoluções", icon: Undo2, slug: "analitico.devolucoes" },
        { href: "/produtos", label: "Curva ABC de Produtos", icon: BarChart3, slug: "produtos" },
      ],
    },
    {
      title: "Rankings",
      links: [
        { href: "/rankings/positivacao", label: "Ranking Positivação", icon: Trophy, slug: "rankings.positivacao" },
        { href: "/rankings/financeiro", label: "Ranking Financeiro", icon: DollarSign, slug: "rankings.financeiro" },
        { href: "/rankings/clientes", label: "Top 20 Clientes", icon: Trophy, slug: "rankings.clientes" },
        { href: "/rankings/vendedores", label: "Top 10 Vendedores", icon: Trophy, slug: "rankings.vendedores" },
      ],
    },
    {
      title: "Distribuição & Evolução",
      links: [
        { href: "/distribuicao", label: "Resumo Distribuição", icon: Package, slug: "distribuicao" },
        { href: "/evolucao", label: "Evolução por Cliente", icon: LineChart, slug: "evolucao" },
      ],
    },
    {
      title: "Uso Interno",
      links: [
        { href: "/admin/importar", label: "Importar Base", icon: Upload, slug: "admin.importar" },
        { href: "/admin/metas", label: "Metas por Fornecedor", icon: Target, slug: "admin.metas" },
        { href: "/admin/comissoes", label: "Faixas de Comissão", icon: Percent, slug: "admin.comissoes" },
        { href: "/admin/fornecedores", label: "Fornecedores", icon: Truck, slug: "admin.fornecedores" },
        { href: "/admin/clientes", label: "Gestão Clientes", icon: Users, slug: "admin.clientes" },
        { href: "/admin/representantes", label: "Gestão Equipe", icon: Users, slug: "admin.representantes" },
        { href: "/admin/usuarios", label: "Usuários", icon: UserCog, slug: "admin.usuarios" },
        { href: "/admin/permissoes", label: "Permissões", icon: ShieldCheck, slug: "admin.permissoes" },
        { href: "/configuracoes", label: "Configurações", icon: Settings, slug: "configuracoes" },
      ],
    },
  ];

  const podeVer = (slug: string) => permissoes === null || permissoes[slug] === "visualizar" || permissoes[slug] === "editar";

  const groupsVisiveis = menuGroups
    .map((group) => ({ ...group, links: group.links.filter((l) => podeVer(l.slug)) }))
    .filter((group) => group.links.length > 0);

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
          {groupsVisiveis.map((group, index) => (
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

        <div className="p-3 border-t border-border shrink-0 space-y-1">
          {/* Fora do filtro de permissões de propósito: manual de uso é como
              /conta — todo mundo precisa alcançar, não é módulo revogável. */}
          <Link
            href="/docs"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group text-sm ${pathname === "/docs"
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            <BookOpen className={`w-4 h-4 transition-colors ${pathname === "/docs" ? "text-accent-foreground" : "group-hover:text-foreground"}`} />
            Manual de Uso
          </Link>

          <div className="flex items-center gap-3 px-2 py-2">
            <Link
              href="/conta"
              title="Minha conta"
              className="flex items-center gap-3 overflow-hidden rounded-md p-1 -m-1 transition-colors hover:bg-muted"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
                {profile.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-foreground truncate">{profile.nome}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
              </div>
            </Link>
            <form action={signOut} className="ml-auto">
              <button type="submit" title="Sair" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
