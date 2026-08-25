# Regras de Negócio e Cálculos

## Regra central: nunca copiar um agregado

A planilha original divergia em vários lugares (positivação aparecia como 533, 471 e 485 em três abas
diferentes — investigado em `docs/PENDENCIAS.md`) porque cada aba era uma cópia/pivot manual de outra. O sistema
resolve isso não guardando nenhum agregado: `/equipe`, rankings, distribuição e financeiro são sempre uma query
ao vivo sobre `vendas` (ou uma das views em `supabase_migration_v1.sql`).

## Mapeamento de fornecedores

Fornecedores vêm do ERP com razão social; o nome fantasia usado nas metas e telas é resolvido via
`fornecedor_aliases` (ver `02-banco-de-dados.md` e `03-importacao-excel.md`).

## Positivação

`is_positivacao` é a flag 0/1 vinda direto do ERP, linha a linha (coluna `PEDIDOS` no export `DD PEDIDOS`, apesar
do nome sugerir outra coisa — confirmado no arquivo real) — o sistema **não** recalcula essa regra em
v1 (mantida como está; ver ressalva em `PENDENCIAS.md` caso o cliente queira redefinir o critério depois).
Positivação de um representante/equipe é `COUNT(DISTINCT cliente_id) WHERE is_positivacao = 1`, somado por
representante (mesma lógica da aba `RESUMO POSITIVAÇÃO`/`RESUMO DISTRIBUIÇÃO` da planilha — não deduplica cliente
entre representantes diferentes).

## Tela `/equipe` (visão RPA e visão por representante via `?rep=`)

- **Meta Financeira / Premiação:** `Meta Financeira (R$)` vem direto de `metas.meta_fin` (cadastrada por
  representante × fornecedor × mês em `/admin/metas`), não é mais derivada de `metaCx * precoMedio` no código.
- **Dias Faturado / Dias Restam:** calculados ao vivo — `Dias Faturado` = número de dias distintos com venda
  registrada no período (não é mais um número fixo atualizado manualmente); `Dias Restam` =
  `dias_uteis - Dias Faturado`.
- **Projeção de Fechamento:** faturamento total até a data ÷ Dias Faturado × Dias Úteis do mês.
- **Cadastro Total / Base Ativa:** contados a partir de `clientes.representante_id`/`status`, com override manual
  opcional em `/admin/metas` (a origem exata desses dois números no ERP não foi confirmada com o cliente).

## Premiação/comissão — ainda em aberto

As abas individuais por representante trazem uma taxa de premiação por fornecedor (`metas.premiacao_pct_cx`,
`premiacao_pct_fin`) e também uma taxa "base" no cabeçalho (`metas_representante.premiacao_pct_*_base`), além de
regras textuais como "Proporcional 90%" e "Acima de 100%" cuja fórmula exata não está clara. O sistema guarda as
taxas fielmente, mas **não calcula** o valor final de premiação em v1 — isso depende de confirmar a fórmula com o
cliente.
