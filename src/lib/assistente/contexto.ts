import { AJUDA } from "@/lib/ajuda/conteudo";

// Fonte de conhecimento do Assistente IA (módulo /assistente).
//
// MANUAL_USO e GLOSSARIO_NEGOCIO são cópias estáticas de texto, não leitura em
// runtime do arquivo original (docs/page.tsx) — uma leitura via fs em runtime
// não é garantida no bundle serverless da Vercel, que só inclui o que
// consegue rastrear estaticamente. Se o Manual de Uso ou o glossário mudarem,
// replique a mudança aqui manualmente (GLOSSARIO_NEGOCIO espelha
// docs/07-glossario-negocio.md). Não existe pipeline de sync automático hoje.
//
// AJUDA é importada de src/lib/ajuda/conteudo.ts (não copiada), então essa
// parte do contexto nunca fica desatualizada.
//
// Escopo deliberadamente restrito a negócio/uso (decisão de 18/09/2026): o
// chat é aberto a todo usuário logado (inclusive vendedor) e usa uma API
// externa (Gemini) — por isso o contexto NÃO inclui nada técnico
// (arquitetura, banco de dados, stack, fluxo de importação em nível de
// código) nem nada de segurança, mesmo o que seria inofensivo expor. Isso é
// reforçado também na instrução de sistema em gemini.ts, que instrui o
// modelo a recusar pergunta técnica/de segurança mesmo que soubesse
// responder. Ficam de fora: PENDENCIAS.md, plano-implementacao-seguranca.md,
// pitch-comercial.md, roteiro-aceitacao.md, 05-componentes-e-layout.md
// (desatualizado) e os resumos técnicos de 01-arquitetura.md,
// 02-banco-de-dados.md e 03-importacao-excel.md que estavam aqui antes.

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

## 6. Se algo não funcionar
- Tela vazia com aviso cinza: falta um passo de cadastro, e o próprio aviso diz qual e de quem é a vez.
- Um item sumiu do menu: o papel do usuário não tem acesso a ele — o Manager libera em "Permissões".
- Comissão zerada: o % de premiação do mês não foi cadastrado em "Metas por Fornecedor".
- Supervisor não vê ninguém: faltam representantes atribuídos em "Usuários".
- Números do mês desatualizados: a importação de vendas do período não foi feita.
- Não consegue entrar: peça ao Manager para redefinir a senha em "Usuários".
Ao reportar um problema, o ideal é dizer em qual tela, qual mês e o que esperava ver.
`.trim();

// Espelha docs/07-glossario-negocio.md — explica o que cada termo/métrica
// SIGNIFICA (curva ABC, positivação, RPA, atingimento...), complementando o
// Manual/Ajuda, que explicam só como usar cada tela. Criado depois de uma
// pergunta real no chat ("o que é a curva ABC de produtos?") expor que esse
// tipo de conceito só tinha uma linha de explicação.
const GLOSSARIO_NEGOCIO = `
## Curva ABC (de produtos)
Técnica de classificação por concentração de faturamento: os produtos são ordenados do que mais vende para o
que menos vende e divididos em três faixas — A (poucos itens, mas a maior parte do faturamento), B
(intermediário) e C (muitos itens, pouca participação individual). Não é um conceito exclusivo deste sistema —
é uma técnica padrão de gestão de estoque/portfólio. Na tela /produtos, serve para decidir onde focar atenção
comercial e estoque.

## Positivação
Contagem de clientes distintos que compraram no período — não é contagem de pedidos. Dez pedidos do mesmo
cliente no mês contam como uma positivação só. Positivação de uma equipe é a soma da positivação de cada
representante, sem deduplicar cliente entre representantes diferentes.

## Atingimento
Percentual de uma meta já alcançado: realizado ÷ meta. Aparece em várias telas (equipe, comissão, faixas de
comissão) sempre com esse mesmo sentido, mudando só o que é "realizado" (caixas, valor financeiro, positivação).

## Realizado
O resultado de fato, vindo das vendas já importadas no período — nunca é um número digitado ou estimado.

## Ticket médio
Valor médio por venda/cliente no período. Aparece no Comparativo Anual como um dos indicadores comparados entre
os dois anos.

## RPA
Não é uma métrica — é como o sistema se refere a um representante nas telas e menus: "Visão Equipe (RPA)",
"Gestão de Representantes (RPA)", o link "Ver RPA <id>", a coluna "RPA" nas tabelas de distribuição. Sempre que
aparecer, é sinônimo de representante/vendedor.

## % de premiação e Fator da faixa (comissão)
% de premiação: taxa cadastrada em Metas por Fornecedor, por representante × fornecedor × mês — zerada, a
comissão sai zero. Fator da faixa: multiplicador cadastrado em Faixas de Comissão, que depende de qual faixa de
atingimento o representante caiu no mês (proporcional ou fator fixo, conforme a faixa).

## Dias Faturado, Dias Restam e Dias Úteis
Dias Úteis: cadastrado por mês em Configurações. Dias Faturado: contado ao vivo — dias distintos do mês com pelo
menos uma venda registrada. Dias Restam: Dias Úteis − Dias Faturado.

## Projeção de Fechamento
Faturamento total até a data ÷ Dias Faturado × Dias Úteis — projeta o ritmo médio diário observado sobre os
dias úteis que faltam.

## Cadastro Total e Base Ativa
Cadastro Total: quantos clientes estão vinculados ao representante. Base Ativa: dos vinculados, quantos têm
status ativo. Contados a partir da tabela de clientes por padrão, com override manual possível quando o número
do ERP não bate.

## Desafio de Distribuição
Meta de cobertura cadastrada por fornecedor (quantos clientes deveriam comprar aquele fornecedor no período). A
tela /distribuicao compara esse desafio contra a cobertura real para apontar onde a distribuição está furada.

## Faturamento Diário
Visão dia a dia do faturamento do período, para enxergar ritmo e concentração de vendas. Dias sem venda aparecem
como zero no gráfico — inclui fins de semana e feriados, não é sinal de falha.

## Devolução
Venda que voltou, identificada pela transação de devolução na base importada. Abate o realizado do período, e
por isso também afeta atingimento e comissão. Só devoluções lançadas manualmente podem ser editadas — as vindas
do import do ERP são só-leitura, porque seriam sobrescritas na reimportação do mês seguinte.

## Fornecedor alias / fila "[Revisar]"
O sistema mapeia a razão social do ERP (que varia de grafia entre exportações) para o "nome fantasia" usado nas
telas via fornecedor_aliases. Razão social sem alias cadastrado gera automaticamente um fornecedor
"[Revisar] <razão social>" — para não perder a venda — que aparece numa fila de revisão em /admin/fornecedores.
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

# Glossário de conceitos e métricas (o que cada termo significa, não como usar a tela)
${GLOSSARIO_NEGOCIO}
`.trim();
