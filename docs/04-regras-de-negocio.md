# Regras de Negócio e Cálculos

A inteligência do negócio mora fortemente nos scripts de agregação e nas telas de painéis, principalmente na rota \/equipe\.

## Tratamento e Mapeamento de Fornecedores
Como ERPs vêm com razão social complexa, criamos um dicionário \NOME_BANCO_PARA_PLANILHA\ que converte automaticamente os registros no banco para o Nome Fantasia acompanhado nas planilhas de meta.

## Telas de Equipe e Metas
Para a tela \/equipe\, as métricas trabalhadas são:
- **Meta Financeira e Premiação:** \Meta Financeira (R$) = Objetivo (Cx) * Preço Médio fixado pela indústria\. O sistema acumula as vendas baseando-se nestas metas diárias. Se o atingimento fica abaixo do percentual ideal (\pctIdeal\), o sistema formata o valor em \ose-600\ (vermelho/alerta).
- **Projeções de Fechamento:** Calculadas pelo faturamento total até a data, dividido pelos dias já trabalhados (Dias Faturados), vezes o total de Dias Úteis do mês.
- **Positivação:** Quantidade total de clientes distintos (CNPJ único) para os quais faturamos no mês em andamento.
