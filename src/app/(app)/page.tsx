import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { createServerSupabase } from "@/lib/supabase/server";
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
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

type HubItem = { title: string; href: string; icon: React.ElementType; desc: string };

const analiticos: HubItem[] = [
  { title: "Ranking Positivação", href: "/rankings/positivacao", icon: Trophy, desc: "Top clientes positivados" },
  { title: "Ranking Financeiro", href: "/rankings/financeiro", icon: DollarSign, desc: "Top clientes em faturamento" },
  { title: "Resumo Distribuição", href: "/distribuicao", icon: Package, desc: "Distribuição de produtos" },
  { title: "Evolução por Cliente", href: "/evolucao", icon: LineChart, desc: "Histórico de compras" },
  { title: "Analítico de Vendas", href: "/analitico/vendas", icon: BarChart3, desc: "Extrato detalhado por nota" },
  { title: "Faturamento Dia", href: "/analitico/faturamento-dia", icon: TrendingUp, desc: "Vendas diárias" },
  { title: "Analítico Cliente", href: "/analitico/cliente", icon: PieChart, desc: "Vendas e devoluções diárias" },
  { title: "Devoluções de Vendas", href: "/analitico/devolucoes", icon: Undo2, desc: "Motivos de devolução" },
];

const resultados: HubItem[] = [
  { title: "Geral Empresa", href: "/", icon: LayoutDashboard, desc: "Consolidado total (Em breve)" },
  { title: "Equipes / RPAs", href: "/equipe", icon: Users, desc: "Desempenho por vendedor" },
];

const interno: HubItem[] = [
  { title: "Atualizar Dados", href: "/admin/importar", icon: Upload, desc: "Importar novas planilhas" },
  { title: "Configurações", href: "/configuracoes", icon: Settings, desc: "Ajustes do sistema" },
];

function HubCard({ item }: { item: HubItem }) {
  return (
    <Link href={item.href} className="group block">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-primary/30 hover:bg-accent/40">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            <item.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
      </div>
    </Link>
  );
}

function HubSection({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: HubItem[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      <div className="grid gap-2.5">
        {items.map((item) => (
          <HubCard key={item.href + item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardHub({
  searchParams,
}: {
  searchParams: Promise<{ "sem-acesso"?: string }>;
}) {
  // requirePageAccess redireciona pra ca com ?sem-acesso=<slug> quando alguem
  // abre uma tela que o papel dele nao alcanca — tipicamente um link recebido
  // de outra pessoa. Sem esse aviso o usuario so ve o Resumo Geral aparecer do
  // nada e acha que o link esta quebrado.
  const { "sem-acesso": semAcesso } = await searchParams;

  let moduloNegado: string | null = null;
  if (semAcesso) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("modulos").select("label").eq("slug", semAcesso).maybeSingle();
    moduloNegado = data?.label ?? semAcesso;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader ajuda="dashboard" title="Resumo Geral" subtitle="Selecione um dos painéis abaixo para visualizar os indicadores comerciais." />

      {moduloNegado && (
        <Alert variant="bloqueio" titulo="Você não tem acesso a essa tela">
          <p>
            O link que você abriu leva para <strong>{moduloNegado}</strong>, e o seu perfil não tem permissão para
            essa tela — por isso você foi trazido para o Resumo Geral. O link não está quebrado.
          </p>
          <p className="mt-1">Se precisar desse acesso, peça ao Manager para liberar em Permissões.</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <HubSection title="Dados Analíticos" icon={BarChart3} items={analiticos} />
        <HubSection title="Resultado de Vendas" icon={TrendingUp} items={resultados} />
        <HubSection title="Uso Interno" icon={Settings} items={interno} />
      </div>
    </div>
  );
}
