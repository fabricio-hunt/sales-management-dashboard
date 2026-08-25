# Componentes e Layout

A UI foca em ser limpa e executiva, na mesma linguagem visual da planilha original (cores condicionais por
atingimento de meta, tabelas densas).

## Menu Lateral (Sidebar)

Arquivo: `src/components/layout/Sidebar.tsx` — responsivo (hambúrguer no mobile, fixo no desktop), organizado em
grupos: *Dashboard, Dados Analíticos, Rankings, Distribuição & Evolução, Uso Interno*.

## Inventário de telas (v1)

| Rota | Fonte de dados |
|---|---|
| `/` | hub de navegação |
| `/equipe`, `/equipe?rep=<id>` | `metas`, `metas_representante`, `periodos` + views |
| `/analitico/vendas` | `vendas` paginado (única tela que lê linha a linha) |
| `/analitico/cliente` | `vw_vendas_cliente_dia` |
| `/analitico/faturamento-dia` | `vw_faturamento_diario` |
| `/analitico/devolucoes` | `vendas` filtrado por `devolucao > 0`, agrupado por `motivo_devolucao` |
| `/produtos` | Curva ABC — não existe na planilha original, adicionada como boa prática de gestão comercial |
| `/rankings/positivacao`, `/rankings/financeiro` | `vw_positivacao_representante`, `vw_financeiro_representante` |
| `/distribuicao` | `vw_realizado_rep_fornecedor` pivotado |
| `/evolucao` | placeholder — histórico desde Jan/2024 fica pra fase 2 |
| `/admin/importar` | upload (ver `03-importacao-excel.md`) |
| `/admin/metas` | CRUD de `metas`/`metas_representante` |
| `/admin/fornecedores` | CRUD de `fornecedores`/`fornecedor_aliases` |
| `/admin/clientes`, `/admin/representantes` | CRUD |
| `/configuracoes` | CRUD de `periodos` |

## Cartões de indicadores (Scorecards)

Tabelas condensadas com `Card` do shadcn/ui. Cor de fundo/texto muda condicionalmente conforme o realizado bate
ou não o `% Ideal` do período (dias faturados ÷ dias úteis).
