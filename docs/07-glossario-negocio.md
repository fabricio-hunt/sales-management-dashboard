# Glossário de Conceitos e Métricas

Termos e métricas que aparecem nas telas mas não têm uma definição própria em nenhum outro lugar — o Manual de
Uso e a Ajuda contextual explicam **como usar cada tela**, este documento explica **o que cada termo significa**.
Criado em 18/09/2026 a partir de uma pergunta real no Assistente IA ("o que é a curva ABC de produtos?") que
expôs que esse tipo de conceito só tinha uma linha de explicação, insuficiente para quem não conhece o termo.

## Curva ABC (de produtos)

Técnica de classificação por concentração de faturamento: os produtos são ordenados do que mais vende para o que
menos vende e divididos em três faixas — **A** (poucos itens, mas a maior parte do faturamento), **B**
(intermediário) e **C** (muitos itens, pouca participação individual no faturamento). Não é um conceito exclusivo
deste sistema — é uma técnica padrão de gestão de estoque/portfólio (também chamada de análise de Pareto
aplicada a produtos). Na tela `/produtos`, serve para decidir onde focar atenção comercial e estoque.

## Positivação

Contagem de **clientes distintos** que compraram no período — não é contagem de pedidos. Dez pedidos do mesmo
cliente no mês contam como uma positivação só. A flag que define se uma venda conta pra positivação vem pronta
do ERP, linha a linha, e o sistema não recalcula esse critério. Positivação de uma equipe é a soma da
positivação de cada representante, sem deduplicar cliente entre representantes diferentes.

## Atingimento

Percentual de uma meta que já foi alcançado: `realizado ÷ meta`. Aparece em várias telas (equipe, comissão,
faixas de comissão) sempre com esse mesmo sentido — "realizado" muda conforme a tela (caixas, valor financeiro,
positivação), mas a conta é sempre a mesma proporção.

## Realizado

O resultado de fato, vindo das vendas já importadas no período — nunca é um número digitado ou estimado. É o que
se compara contra a meta para calcular atingimento.

## Ticket médio

Valor médio por venda/cliente no período (faturamento total dividido pela quantidade de transações ou clientes,
conforme a tela). Aparece no Comparativo Anual como um dos indicadores comparados entre os dois anos.

## RPA

Não é uma métrica — é como o sistema (e a planilha original) se refere a um **representante** nas telas e nos
menus: "Visão Equipe (RPA)", "Gestão de Representantes (RPA)", o link "Ver RPA \<id\>" na tela de equipe, e a
coluna "RPA" nas tabelas de distribuição. Sempre que aparecer "RPA" numa tela ou num link, é sinônimo de
representante/vendedor — geralmente seguido do código dele (o mesmo `id` usado no ERP).

## % de premiação e Fator da faixa (comissão)

Dois números diferentes que se multiplicam para chegar na comissão (ver `04-regras-de-negocio.md` /
`06-assistente-ia.md` para a fórmula completa):
- **% de premiação**: taxa cadastrada em Metas por Fornecedor, por representante × fornecedor × mês. Se estiver
  zerada, a comissão sai zero mesmo com venda registrada.
- **Fator da faixa**: multiplicador cadastrado em Faixas de Comissão, que depende de qual faixa de atingimento o
  representante caiu naquele mês — pode ser proporcional ao atingimento ou um fator fixo, conforme a faixa.

## Dias Faturado, Dias Restam e Dias Úteis

- **Dias Úteis**: cadastrado por mês em Configurações — quantos dias o período tem pra efeito de projeção.
- **Dias Faturado**: contado ao vivo — número de dias distintos do mês em que houve pelo menos uma venda
  registrada (não é um número fixo atualizado manualmente).
- **Dias Restam**: `Dias Úteis − Dias Faturado`.

## Projeção de Fechamento

Estimativa de como o mês deve fechar, calculada como `faturamento total até a data ÷ Dias Faturado × Dias
Úteis` — ou seja, projeta o ritmo médio diário observado até agora sobre os dias úteis que faltam.

## Cadastro Total e Base Ativa

- **Cadastro Total**: quantos clientes estão vinculados ao representante (`clientes.representante_id`).
- **Base Ativa**: dos vinculados, quantos têm `status = ativo`.
Os dois são contados a partir da tabela de clientes por padrão, mas aceitam um valor de override manual em
Metas por Fornecedor/Representante quando o número do ERP não bate com o que está cadastrado no sistema — a
origem exata desses dois números no ERP nunca foi confirmada com o cliente (ver `PENDENCIAS.md`).

## Desafio de Distribuição

Meta de cobertura cadastrada por fornecedor (quantos clientes/pontos de venda deveriam comprar aquele fornecedor
no período). A tela `/distribuicao` compara esse desafio contra a cobertura real pra apontar onde a distribuição
"está furada" — fornecedor com desafio cadastrado e execução abaixo dele.

## Faturamento Diário

Visão dia a dia do faturamento do período, pra enxergar ritmo e concentração de vendas (ex.: se o mês está
concentrado nos últimos dias). Dias sem venda aparecem como zero no gráfico — isso inclui fins de semana e
feriados, não é sinal de falha.

## Devolução

Venda que voltou, identificada pela transação de devolução na base importada. Abate o realizado do período, e
por isso também afeta atingimento e comissão. Só devoluções lançadas manualmente pelo sistema podem ser
editadas/excluídas — as que vêm do import do ERP são só-leitura, porque seriam sobrescritas na reimportação do
mês seguinte.

## Fornecedor alias / fila "[Revisar]"

O ERP exporta o fornecedor pela razão social, que costuma vir grafada de formas diferentes entre exportações. O
sistema mapeia essa razão social para o "nome fantasia" usado nas telas via `fornecedor_aliases`. Quando o
import encontra uma razão social sem alias cadastrado, ele cria automaticamente um fornecedor
`[Revisar] <razão social>` — pra não perder a venda — que aparece numa fila de revisão em `/admin/fornecedores`
até alguém confirmar o alias correto.
