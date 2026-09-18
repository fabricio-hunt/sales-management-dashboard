import { AJUDA } from "@/lib/ajuda/conteudo";

// Fonte de conhecimento do Assistente IA (módulo /assistente).
//
// MANUAL_USO e DOCS_TECNICOS são cópias estáticas de texto, não leitura em
// runtime dos arquivos originais (docs/page.tsx e dashboard/docs/*.md) — uma
// leitura via fs em runtime não é garantida no bundle serverless da Vercel,
// que só inclui o que consegue rastrear estaticamente. Se o Manual de Uso ou
// os docs técnicos mudarem, replique a mudança aqui manualmente. Não existe
// pipeline de sync automático hoje.
//
// AJUDA é importada de src/lib/ajuda/conteudo.ts (não copiada), então essa
// parte do contexto nunca fica desatualizada.
//
// Curadoria deliberada de segurança: o chat é aberto a todo usuário logado
// (inclusive vendedor) e usa uma API externa (Gemini). Por isso ficam de fora
// de propósito: PENDENCIAS.md, plano-implementacao-seguranca.md,
// pitch-comercial.md, roteiro-aceitacao.md (conteúdo interno/comercial, não é
// ajuda de uso) e as seções "Segurança (RLS)" e "Criptografia" de
// 02-banco-de-dados.md (detalham a postura de segurança do sistema). O
// inventário de telas de 05-componentes-e-layout.md também ficou de fora por
// estar desatualizado e duplicar, de forma pior, o que já está no Manual.

const MANUAL_USO = `
## 1. Primeiro acesso e senha
Quem cria o usuário é o Manager, que define uma senha inicial e a repassa. Como essa senha passou pela mão de
outra pessoa, ela só vale para o primeiro acesso: ao entrar, o sistema obriga a trocar a senha antes de liberar
qualquer outra tela. A senha precisa ter no mínimo 6 caracteres. Depois do primeiro acesso, nome de exibição e
senha podem ser trocados a qualquer momento em "Minha conta" (clique no seu nome, no rodapé do menu lateral).
Também é possível entrar com Google, desde que o e-mail da conta Google seja idêntico ao e-mail já cadastrado —
não existe autocadastro por esse caminho.
Não existe recuperação de senha por e-mail: o sistema não envia e-mails. Se a senha for perdida, o único caminho
é pedir ao Manager para abrir "Usuários", clicar no ícone de chave ao lado do nome da pessoa e gerar uma nova —
que também vale só para um acesso.

## 2. Quem enxerga o quê (papéis)
Existem três papéis, com alcances diferentes sobre os mesmos dados. O que aparece no menu lateral muda conforme
o papel, mas o alcance dos dados é garantido no banco, não só na interface — digitar um endereço direto não
amplia o que a pessoa vê.
- Vendedor: vê exclusivamente o próprio representante — próprias vendas, própria carteira de clientes, próprias
  metas e própria comissão. Também pode lançar venda manualmente.
- Supervisor: vê os representantes que o Manager atribuiu a ele, nenhum outro. Enquanto nenhum for atribuído, as
  telas de equipe e comissão aparecem vazias com um aviso explicando isso.
- Manager: vê tudo e é o único que administra — cria usuários, define permissões por módulo, importa a base,
  cadastra metas, fornecedores, clientes e faixas de comissão.
O Manager ajusta permissão módulo a módulo em "Permissões", e atribui representantes a um supervisor em
"Usuários" (expandir o usuário, marcar os representantes, "Salvar atribuições").

## 3. As telas, uma a uma
- Resumo Geral: ponto de partida — faturamento, margem e evolução do período.
- Lançar Venda: registro manual, para correção/exceção. O dia a dia vem do Palmtop pela importação; o que é
  lançado manualmente fica marcado como tal e não é apagado por uma reimportação.
- Visão Equipe (RPA): meta contra realizado por representante e por fornecedor, com positivação e atingimento.
- Comissão/Premiação: estimativa de comissão (ver seção 5 antes de usar o valor para pagamento).
- Analítico de Vendas, Cliente, Faturamento Diário e Devoluções: recortes detalhados para investigar um número
  que chamou atenção no resumo.
- Curva ABC de Produtos: quais itens concentram faturamento.
- Rankings: positivação, financeiro, top 20 clientes e top 10 vendedores — cada um só ordena o que estiver
  dentro do escopo de quem está vendo.
- Distribuição e Evolução: cobertura por fornecedor e evolução de compra por cliente.
- Comparativo Anual: compara dois anos civis lado a lado (faturamento, devolução, positivação, ticket médio).
- Uso Interno (Importação, Metas, Faixas de Comissão, Fornecedores, Clientes, Equipe, Usuários, Permissões,
  Configurações): em geral só para Manager.
Todo número é calculado ao vivo a partir das vendas importadas — nada é digitado ou congelado à mão. Se um valor
parece errado, a causa quase sempre está na base do mês (importação incompleta ou meta não cadastrada), não no
cálculo.

## 4. Rotina mensal de importação (só Manager)
Em "Importar Base" existem cinco importações independentes: vendas, clientes, fornecedores, metas e objetivos
por representante. Cada uma aceita a planilha exportada do ERP e tem um modelo em branco para baixar.
- Vendas: substitui os dados do período contido no arquivo. É a única que pede confirmação explícita antes de
  gravar, justamente porque substitui.
- As outras quatro: são aditivas — atualizam o que existe e criam o que falta, nunca apagam.
Clientes já vinculados manualmente a um representante não são sobrescritos pela importação, a não ser que a
opção "Sobrescrever atribuições manuais" seja marcada (deixe desmarcado no uso normal).
Ordem recomendada no fechamento do mês: fornecedores, clientes, metas, objetivos e por último vendas.

## 5. Como a comissão é calculada
A conta que roda hoje, por representante e por fornecedor, é:
  realizado × % de premiação × fator da faixa de atingimento
- Realizado: vem das vendas importadas, em caixas e em valor financeiro.
- % de premiação: cadastrado em "Metas por Fornecedor". Se estiver zerado, a comissão sai zero.
- Fator da faixa: cadastrado em "Faixas de Comissão", conforme o percentual atingido da meta.
Estão cobertos o Prêmio por Caixa (por fornecedor) e o Prêmio Financeiro. Ainda NÃO estão: a diferença entre CLT
e PJ e o Prêmio de Positivação. O regime de cada representante já pode ser cadastrado em "Gestão Equipe", mas
nenhum cálculo o usa ainda. As faixas atualmente cadastradas são um rascunho tirado da planilha original e
precisam ser confirmadas antes de qualquer pagamento — avise o usuário desse ponto se ele perguntar sobre usar a
comissão para pagamento real.

## 6. Segurança dos dados (visão para o usuário final)
O escopo de cada papel é aplicado no banco de dados, não só na interface — trocar o endereço no navegador não
amplia o que alguém vê. Nenhuma tela grava dado direto no banco: toda alteração passa por uma checagem de
permissão no servidor. Cada pessoa deve ter o próprio usuário — login compartilhado inutiliza o escopo por
representante e o histórico de quem lançou o quê.

## 7. Se algo não funcionar
- Tela vazia com aviso cinza: falta um passo de cadastro, e o próprio aviso diz qual e de quem é a vez.
- Um item sumiu do menu: o papel do usuário não tem acesso a ele — o Manager libera em "Permissões".
- Comissão zerada: o % de premiação do mês não foi cadastrado em "Metas por Fornecedor".
- Supervisor não vê ninguém: faltam representantes atribuídos em "Usuários".
- Números do mês desatualizados: a importação de vendas do período não foi feita.
- Não consegue entrar: peça ao Manager para redefinir a senha em "Usuários".
Ao reportar um problema, o ideal é dizer em qual tela, qual mês e o que esperava ver.
`.trim();

const DOCS_TECNICOS = `
## Arquitetura (visão geral, para perguntas mais técnicas)
O sistema é um dashboard de gestão comercial para uma distribuidora, construído para substituir o controle
mensal feito em planilha Excel — mesma linguagem visual e métricas que a equipe já usa (positivação, metas por
fornecedor, distribuição, rankings), só que lendo direto do banco em vez de pivôs manuais. Stack: Next.js (App
Router) no frontend, Tailwind CSS + shadcn/ui na interface, Supabase (PostgreSQL) como backend/banco.
Princípio central: nenhum agregado (positivação, distribuição, financeiro, ranking) é copiado ou fixado no
código — tudo é calculado ao vivo via consulta sobre a tabela de vendas. Isso existe porque, na planilha antiga,
o mesmo número (ex.: positivação) podia aparecer diferente em abas diferentes por ser cópia manual desatualizada
de outra aba.

## Banco de dados (estrutura, para perguntas sobre de onde vem um número)
Tabelas de dimensão: representantes, clientes (com vínculo a um representante — a "carteira"), fornecedores
(com apelidos/aliases para casar com o nome usado no ERP), produtos.
Tabela fato: vendas — um registro por item de pedido faturado, com valor líquido, quantidade, data, o
representante/cliente/produto envolvidos, e a flag de positivação vinda direto do ERP.
Configuração mensal: períodos (um por mês, com datas e dias úteis), metas (por representante × fornecedor ×
mês), metas_representante (objetivos que não são por fornecedor), import_log (histórico de cada importação).
Tudo que a planilha calculava via pivô manual (positivação, distribuição, financeiro por fornecedor) virou uma
consulta/view sobre vendas, feita ao vivo pelas telas.

## Importação de dados (fluxo)
A tela "Importar Base" tem 5 importações independentes, cada uma podendo ser usada sozinha:
- Vendas: única importação destrutiva — apaga e reinsere as vendas do período contido no arquivo (por isso pede
  confirmação explícita antes de gravar). Reimportar o mesmo arquivo não duplica nada.
- Fornecedores, Clientes, Metas, Objetivos por representante: aditivas (upsert) — atualizam cadastro existente e
  criam o que falta, nunca apagam uma linha que não estava no arquivo enviado.
Linhas sem cliente/produto/data válida não entram na importação de vendas, mas são contadas e reportadas como
"linhas ignoradas", em vez de sumirem silenciosamente.

## Regras de negócio (cálculos)
Regra central: nenhuma tela guarda um número agregado pronto — positivação, distribuição, financeiro e rankings
são sempre uma consulta ao vivo sobre as vendas importadas.
Positivação: é a contagem de clientes distintos com venda no período (a flag de positivação vem pronta do ERP,
linha a linha, e não é recalculada pelo sistema) — positivação de uma equipe soma a positivação de cada
representante, sem deduplicar cliente entre representantes diferentes.
Tela de equipe: a meta financeira vem do cadastro em Metas por Fornecedor (não é mais calculada a partir de meta
em caixas × preço médio); dias faturados/dias restantes são calculados ao vivo a partir dos dias com venda
registrada no período.
`.trim();

function formatarAjuda(): string {
  return Object.entries(AJUDA)
    .map(([slug, conteudo]) => {
      const linhas = [`### Tela: ${slug}`, conteudo.resumo];
      if (conteudo.passos.length > 0) linhas.push(`Como usar: ${conteudo.passos.join(" ")}`);
      if (conteudo.fonte) linhas.push(`De onde vem o número: ${conteudo.fonte}`);
      if (conteudo.atencao) linhas.push(`Atenção: ${conteudo.atencao}`);
      return linhas.join("\n");
    })
    .join("\n\n");
}

export const CONTEXTO_DOCUMENTACAO = `
# Manual de Uso do sistema
${MANUAL_USO}

# Ajuda contextual por tela (o que cada tela do menu lateral responde)
${formatarAjuda()}

# Documentação técnica de apoio (arquitetura, banco de dados, importação, regras de negócio)
${DOCS_TECNICOS}
`.trim();
