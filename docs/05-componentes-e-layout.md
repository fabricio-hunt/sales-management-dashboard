# Componentes e Layout

A UI foca em ser limpa e executiva, na mesma linguagem visual da planilha original (cores condicionais por
atingimento de meta, tabelas densas).

## Menu Lateral (Sidebar)

Arquivo: `src/components/layout/Sidebar.tsx` — responsivo (hambúrguer no mobile, fixo no desktop), organizado em
grupos: *Dashboard, Dados Analíticos, Rankings, Distribuição & Evolução, Uso Interno*.

## Inventário de telas (v1.1)

| Rota | Fonte de dados |
|---|---|
| `/` | hub de navegação |
| `/admin/vendas` | lançamento manual de venda |
| `/equipe`, `/equipe?rep=<id>` | `metas`, `metas_representante`, `periodos` + views |
| `/comissoes` | estimativa de comissão por representante × fornecedor (ver `04-regras-de-negocio.md`) |
| `/analitico/vendas` | `vendas` paginado (única tela que lê linha a linha) |
| `/analitico/cliente` | `vw_vendas_cliente_dia` |
| `/analitico/faturamento-dia` | `vw_faturamento_diario` |
| `/analitico/devolucoes` | `vendas` filtrado por `devolucao > 0`, agrupado por `motivo_devolucao` |
| `/produtos` | Curva ABC — não existe na planilha original, adicionada como boa prática de gestão comercial |
| `/rankings/positivacao`, `/rankings/financeiro` | `vw_positivacao_representante`, `vw_financeiro_representante` |
| `/rankings/clientes` | top 20 clientes por faturamento no período |
| `/rankings/vendedores` | top 10 representantes por realizado no período |
| `/distribuicao` | `vw_realizado_rep_fornecedor` pivotado |
| `/evolucao` | placeholder — histórico desde Jan/2024 fica pra fase 2 |
| `/comparativo-anual` | dois anos civis lado a lado — faturamento, devolução, positivação, ticket médio |
| `/assistente` | chat de IA sobre a documentação do sistema (ver `06-assistente-ia.md`) |
| `/docs` | Manual de Uso — texto estático, sem fonte de dados |
| `/admin/importar` | upload (ver `03-importacao-excel.md`) |
| `/admin/metas` | CRUD de `metas`/`metas_representante` |
| `/admin/comissoes` | CRUD de faixas de comissão (atingimento → fator) |
| `/admin/fornecedores` | CRUD de `fornecedores`/`fornecedor_aliases` |
| `/admin/clientes`, `/admin/representantes` | CRUD |
| `/admin/usuarios` | CRUD de usuários/papéis, atribuição de representantes a supervisor |
| `/admin/permissoes` | matriz de permissões por papel/módulo, com exceção por usuário |
| `/configuracoes` | CRUD de `periodos` |
| `/conta` | dados de acesso do próprio usuário (nome, senha) |

## Cartões de indicadores (Scorecards)

Tabelas condensadas com `Card` do shadcn/ui. Cor de fundo/texto muda condicionalmente conforme o realizado bate
ou não o `% Ideal` do período (dias faturados ÷ dias úteis).
