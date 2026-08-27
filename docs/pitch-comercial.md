# Pitch Comercial — material interno

> **Interno. Não publicar na aplicação.**
> Este conteúdo vivia em `src/app/(app)/docs/page.tsx`, uma rota sem checagem de
> permissão que **qualquer usuário logado conseguia abrir pela barra de endereço** —
> inclusive o próprio cliente, que leria um card chamado "O que falar para o cliente".
> Movido pra cá em 27/08/2026, quando `/docs` virou o Manual de Uso do cliente.

## Arquitetura (o que falar em reunião)

O Commercial Management Dashboard é construído com as tecnologias mais modernas do
mercado (a mesma base usada por gigantes tech). Utilizamos **Next.js (React)** para uma
interface extremamente rápida e responsiva. No backend, a base de dados está hospedada
no **Supabase (PostgreSQL)**, que garante segurança de dados a nível empresarial,
escalabilidade para milhões de registros e performance ultra-rápida (buscas em
milissegundos).

## Funcionalidades entregues (MVP)

- **Ingestão de dados massivos:** motor capaz de ler e processar dezenas de milhares de
  registros via planilhas pesadas (ex: 50 mil+ linhas).
- **Mapeamento automático:** resolução de nomenclaturas (VDA LIQ, Valor Venda, Cliente)
  ignorando cabeçalhos sujos das extrações de ERP.
- **Painel executivo (visão geral):** cálculo instantâneo de faturamento, lucro líquido,
  margem e contagem de clientes (unique).
- **Gráficos de evolução:** curva de crescimento e faturamento mês a mês em tempo real.

## Descoberta de dados (colunas que geram valor)

| Coluna da planilha | O que destrava |
|---|---|
| `Representante` / `Supervisor` | comissões, rankings de vendas e metas por equipe |
| `Cond. Pagto` / `Tipo Doc` | painéis financeiros de previsibilidade de caixa (contas a receber) |
| `Ramo` / `Fornecedor` | análise de Pareto (curva ABC). Ex: qual ramo traz mais lucro? |
| `Transação` (devolução) | rastrear produtos com alto índice de logística reversa ou defeito |

## Roadmap — expansões a oferecer

- **Módulo comercial:** ranking de representantes (top performers), análise de
  atingimento de metas e performance de positivação (novos clientes abertos).
- **Módulo de produtos:** curva ABC de produtos e marcas parceiras (fornecedores).
  Quais itens dão mais lucro real vs maior volume logístico?
- **Dashboards dinâmicos:** filtros globais de período (data inicial/final), estado (UF)
  e empresa, permitindo que a diretoria cruze qualquer dado em tempo real.
