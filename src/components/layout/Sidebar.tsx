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
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Visão Geral", icon: LayoutDashboard },
    { href: "/comercial", label: "Comercial", icon: Users },
    { href: "/produtos", label: "Produtos", icon: BarChart3 },
    { href: "/docs", label: "Documentação", icon: BookOpen },
    { href: "/admin", label: "Atualizar Dados", icon: Upload },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="w-64 flex flex-col h-screen border-r bg-background shrink-0">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
          Commercial
          <br />
          Management
        </h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Menu Principal
        </p>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${isActive ? "text-blue-600" : "group-hover:text-foreground"}`}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Administrador</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
