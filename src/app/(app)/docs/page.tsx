import { getCurrentProfile } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  BookOpen,
  KeyRound,
  Users,
  Upload,
  Percent,
  BarChart3,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";

// Manual de uso do cliente.
//
// ATENÇÃO: esta rota já foi uma página de pitch comercial interno ("O que falar
// para o cliente") e era a única de (app) sem checagem de acesso — qualquer
// usuário logado, inclusive o próprio cliente, abria pela barra de endereço.
// O conteúdo de pitch foi movido pra docs/pitch-comercial.md, fora da aplicação.
//
// De propósito continua SEM requirePageAccess e SEM entrada na tabela modulos:
// manual de uso é como /conta, todo mundo precisa alcançar, não é um módulo que
// o Manager deva poder revogar de alguém.

export const metadata = {
  title: "Manual de Uso",
};

const ROLE_LABEL: Record<string, string> = {
  manager: "Manager",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

function Secao({
  id,
  icon: Icon,
  titulo,
  descricao,
  children,
}: {
  id: string;
  icon: React.ElementType;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <CardTitle>{titulo}</CardTitle>
        </div>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function Papel({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-semibold text-foreground">{nome}</p>
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  );
}

const INDICE: [string, string][] = [
  ["primeiro-acesso", "Primeiro acesso e senha"],
  ["papeis", "Quem enxerga o quê"],
  ["telas", "As telas, uma a uma"],
  ["importar", "Rotina mensal de importação"],
  ["comissao", "Como a comissão é calculada"],
  ["seguranca", "Segurança dos dados"],
  ["problemas", "Se algo não funcionar"],
];

export default async function ManualPage() {
  const profile = await getCurrentProfile();
  const papel = profile ? ROLE_LABEL[profile.role] ?? profile.role : null;

  return (
    <div className="max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="Manual de Uso"
        subtitle="Como operar o sistema no dia a dia — o que cada tela mostra e de onde vem cada número."
      />

      {papel && (
        <Alert variant="info" titulo={"Você está conectado como " + papel}>
          <p>
            O manual descreve o sistema inteiro. Itens marcados como <strong>só Manager</strong> não aparecem no seu
            menu se você não for Manager — isso é esperado, não é erro.
          </p>
        </Alert>
      )}

      <Alert variant="ok" titulo="Ajuda dentro de cada tela">
        <p>
          Além deste manual, cada tela tem um botão <strong>Como usar esta tela</strong> logo abaixo do título. Ele
          explica o que aquela tela responde, de onde vem cada número e o erro de leitura mais comum. Fica fechado
          por padrão e lembra a sua escolha.
        </p>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
            <CardTitle>Índice</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {INDICE.map(([id, label], i) => (
              <li key={id}>
                <a href={"#" + id} className="text-foreground underline-offset-4 hover:underline">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Secao
        id="primeiro-acesso"
        icon={KeyRound}
        titulo="1. Primeiro acesso e senha"
        descricao="Como entrar pela primeira vez e o que fazer se esquecer a senha."
      >
        <p>
          Quem cria o seu usuário é o <strong>Manager</strong>. Ele define uma senha inicial e te passa. Como essa
          senha passou pela mão de outra pessoa, ela vale só para o primeiro acesso: ao entrar, o sistema leva você
          direto para a tela <strong>Trocar senha</strong> e não libera mais nada até você definir uma nova. A senha
          precisa ter no mínimo 6 caracteres.
        </p>
        <p>
          Depois disso, você troca a senha ou o nome de exibição quando quiser em <strong>Minha conta</strong> —
          clique no seu nome, no rodapé do menu lateral.
        </p>
        <Alert variant="aviso" titulo="Não existe recuperação de senha por e-mail">
          <p>
            O sistema não envia e-mails. Se você perder a senha, o único caminho é pedir ao Manager para abrir{" "}
            <strong>Usuários</strong>, clicar no ícone de chave ao lado do seu nome e gerar uma nova. Ela volta a
            valer só para um acesso: você será obrigado a trocá-la de novo ao entrar.
          </p>
        </Alert>
      </Secao>

      <Secao
        id="papeis"
        icon={Users}
        titulo="2. Quem enxerga o quê"
        descricao="Três papéis, com alcances diferentes sobre os mesmos dados."
      >
        <p>
          O que aparece no menu lateral muda conforme o seu papel. Mais importante: <strong>o alcance dos dados é
          garantido no banco</strong>, não apenas no menu — mesmo digitando um endereço direto, ninguém enxerga dado
          fora do próprio escopo.
        </p>
        <div className="grid gap-3">
          <Papel nome="Vendedor">
            <p>
              Vê exclusivamente o próprio representante: as próprias vendas, a própria carteira de clientes, as
              próprias metas e a própria comissão. Também pode lançar venda.
            </p>
          </Papel>
          <Papel nome="Supervisor">
            <p>
              Vê os representantes que o Manager atribuiu a ele — nenhum outro. Enquanto nenhum for atribuído, as
              telas de equipe e comissão aparecem vazias com um aviso explicando isso.
            </p>
          </Papel>
          <Papel nome="Manager">
            <p>
              Vê tudo e é o único que administra: cria usuários, define permissões por módulo, importa a base,
              cadastra metas, fornecedores, clientes e faixas de comissão.
            </p>
          </Papel>
        </div>
        <p>
          O Manager ajusta módulo a módulo em <strong>Permissões</strong>, e atribui representantes a um supervisor
          em <strong>Usuários</strong> (expandir o usuário, marcar os representantes, <strong>Salvar
          atribuições</strong>). <span className="font-medium text-foreground">Só Manager.</span>
        </p>
      </Secao>

      <Secao id="telas" icon={BarChart3} titulo="3. As telas, uma a uma" descricao="O que cada uma responde.">
        <ul className="space-y-2">
          <li>
            <strong className="text-foreground">Resumo Geral</strong> — ponto de partida: faturamento, margem e
            evolução do período.
          </li>
          <li>
            <strong className="text-foreground">Lançar Venda</strong> — registro manual. A venda do dia a dia vem do
            Palmtop pela importação; esta tela é para correção e exceção. O que você lança aqui fica marcado como
            manual e não é apagado pela importação.
          </li>
          <li>
            <strong className="text-foreground">Visão Equipe (RPA)</strong> — meta contra realizado por
            representante e por fornecedor, com positivação e atingimento.
          </li>
          <li>
            <strong className="text-foreground">Comissão/Premiação</strong> — estimativa de comissão. Ver a seção 5
            antes de usar para pagamento.
          </li>
          <li>
            <strong className="text-foreground">Analítico de Vendas, Cliente, Faturamento Diário e Devoluções</strong>{" "}
            — recortes detalhados para investigar um número que chamou atenção no resumo.
          </li>
          <li>
            <strong className="text-foreground">Curva ABC de Produtos</strong> — quais itens concentram faturamento.
          </li>
          <li>
            <strong className="text-foreground">Rankings</strong> — positivação, financeiro, top 20 clientes e top 10
            vendedores. Cada um só ordena o que estiver dentro do seu escopo.
          </li>
          <li>
            <strong className="text-foreground">Distribuição e Evolução</strong> — cobertura por fornecedor e
            evolução de compra por cliente.
          </li>
          <li>
            <strong className="text-foreground">Uso Interno</strong> — importação, metas, faixas de comissão,
            fornecedores, clientes, equipe, usuários e permissões.{" "}
            <span className="font-medium text-foreground">Em geral só Manager.</span>
          </li>
        </ul>
        <Alert variant="info" titulo="Números fora do esperado?">
          <p>
            Todo número é calculado ao vivo a partir das vendas importadas — nada é digitado ou congelado. Se um
            valor parece errado, a causa quase sempre está na base do mês (importação incompleta ou meta não
            cadastrada), não no cálculo.
          </p>
        </Alert>
      </Secao>

      <Secao
        id="importar"
        icon={Upload}
        titulo="4. Rotina mensal de importação"
        descricao="Só Manager. É o que mantém todo o resto atualizado."
      >
        <p>
          Em <strong>Importar Base</strong> existem cinco importações independentes: vendas, clientes, fornecedores,
          metas e objetivos por representante. Cada uma aceita a planilha exportada do ERP e tem um modelo em branco
          para baixar, com os nomes de coluna exatos que o sistema espera.
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-foreground">Vendas</strong> — substitui os dados do período contido no arquivo. É
            a única que pede confirmação explícita antes de gravar, justamente porque substitui.
          </li>
          <li>
            <strong className="text-foreground">As outras quatro</strong> — são aditivas: atualizam o que existe e
            criam o que falta, nunca apagam.
          </li>
        </ul>
        <p>
          Clientes já vinculados manualmente a um representante não são sobrescritos pela importação, a não ser que
          você marque <strong>Sobrescrever atribuições manuais</strong>. Deixe desmarcado no uso normal.
        </p>
        <p>Ordem recomendada no fechamento do mês: fornecedores, clientes, metas, objetivos e por último vendas.</p>
      </Secao>

      <Secao
        id="comissao"
        icon={Percent}
        titulo="5. Como a comissão é calculada"
        descricao="Leia antes de usar os valores para pagamento."
      >
        <p>A conta que roda hoje, por representante e por fornecedor, é:</p>
        <p className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
          realizado × % de premiação × fator da faixa de atingimento
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-foreground">Realizado</strong> — vem das vendas importadas, em caixas e em valor
            financeiro.
          </li>
          <li>
            <strong className="text-foreground">% de premiação</strong> — cadastrado em{" "}
            <strong>Metas por Fornecedor</strong>. Se estiver zerado, a comissão sai zero.
          </li>
          <li>
            <strong className="text-foreground">Fator da faixa</strong> — cadastrado em{" "}
            <strong>Faixas de Comissão</strong>, conforme o percentual atingido da meta.
          </li>
        </ul>
        <Alert variant="aviso" titulo="O que ainda não está no cálculo">
          <p>
            Estão cobertos o <strong>Prêmio por Caixa</strong> (por fornecedor) e o <strong>Prêmio Financeiro</strong>
            . Ainda <strong>não</strong> estão: a diferença entre <strong>CLT e PJ</strong> e o{" "}
            <strong>Prêmio de Positivação</strong>. O regime de cada representante já pode ser cadastrado em{" "}
            <strong>Gestão Equipe</strong>, mas nenhum cálculo o usa ainda.
          </p>
          <p className="mt-1">
            As faixas atualmente cadastradas são um rascunho tirado da planilha original e precisam ser confirmadas
            antes de qualquer pagamento.
          </p>
        </Alert>
      </Secao>

      <Secao id="seguranca" icon={ShieldCheck} titulo="6. Segurança dos dados" descricao="Como o acesso é limitado.">
        <ul className="space-y-2">
          <li>
            O escopo de cada papel é aplicado <strong>no banco de dados</strong>, não só na interface: trocar o
            endereço no navegador não amplia o que você vê.
          </li>
          <li>
            Nenhuma tela grava dado direto no banco — toda alteração passa por uma checagem de permissão no servidor.
          </li>
          <li>
            Cada pessoa deve ter o próprio usuário. Login compartilhado inutiliza o escopo por representante e o
            histórico de quem lançou o quê.
          </li>
          <li>
            Ao criar um usuário, o Manager escolhe uma senha inicial — evite reaproveitar a mesma para várias
            pessoas, já que ela circula por fora do sistema.
          </li>
        </ul>
      </Secao>

      <Secao id="problemas" icon={LifeBuoy} titulo="7. Se algo não funcionar" descricao="Antes de reportar, confira aqui.">
        <ul className="space-y-2">
          <li>
            <strong className="text-foreground">Tela vazia com aviso cinza</strong> — falta um passo de cadastro, e o
            próprio aviso diz qual e de quem é a vez.
          </li>
          <li>
            <strong className="text-foreground">Um item sumiu do menu</strong> — seu papel não tem acesso a ele. O
            Manager libera em <strong>Permissões</strong>.
          </li>
          <li>
            <strong className="text-foreground">Comissão zerada</strong> — o % de premiação do mês não foi cadastrado
            em <strong>Metas por Fornecedor</strong>.
          </li>
          <li>
            <strong className="text-foreground">Supervisor não vê ninguém</strong> — faltam representantes atribuídos
            em <strong>Usuários</strong>.
          </li>
          <li>
            <strong className="text-foreground">Números do mês desatualizados</strong> — a importação de vendas do
            período não foi feita.
          </li>
          <li>
            <strong className="text-foreground">Não consigo entrar</strong> — peça ao Manager para redefinir a senha
            em <strong>Usuários</strong>.
          </li>
        </ul>
        <p>
          Ao reportar um problema, diga <strong>em qual tela</strong>, <strong>qual mês</strong> e{" "}
          <strong>o que esperava ver</strong> — é o que permite reproduzir e corrigir rápido.
        </p>
      </Secao>
    </div>
  );
}
