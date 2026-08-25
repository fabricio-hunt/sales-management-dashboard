# Arquitetura do Sistema

O **Commercial Management Dashboard** é um sistema de análise e gestão comercial pra uma distribuidora, construído
pra substituir o controle mensal feito hoje 100% em planilha Excel — mesma linguagem visual e métricas que a
equipe já usa (positivação, metas por fornecedor, distribuição numérica, rankings), só que lendo direto do banco
em vez de pivots manuais.

## Tecnologias

- **Frontend:** Next.js 16 (App Router), React Server Components como padrão — só as telas com formulário/edição
  são Client Components.
- **Estilização:** Tailwind CSS + shadcn/ui.
- **Backend e Banco:** Supabase (PostgreSQL).
- **Ícones:** Lucide React.

## Estrutura do projeto (dashboard/src)

- `/app`: rotas da aplicação. Ver `05-componentes-e-layout.md` pro inventário completo de telas.
- `/app/admin/actions.ts`: Server Actions — toda escrita no banco (metas, fornecedores, clientes, representantes,
  período) passa por aqui, usando a service role key. Nunca escreva direto do client com a anon key.
- `/app/api/admin/import/{vendas,fornecedores,clientes,metas}`: 4 endpoints de importação independentes, um por
  entidade. Ver `03-importacao-excel.md`.
- `/components`: componentes reutilizáveis (`layout/Sidebar.tsx`, `ui/*`).
- `/lib/supabase.ts`: cliente anon (só leitura, usado nas telas).
- `/lib/supabaseAdmin.ts`: cliente com service role (só server-side).

## Princípio central

A planilha original é, na prática, um monte de pivots manuais em cima de uma única base bruta (`DD PEDIDOS`),
copiados entre abas — cada cópia é uma chance de ficar desatualizada (foi exatamente isso que causou a
divergência de positivação 533 vs. 471 vs. 485 investigada em `docs/PENDENCIAS.md`). Por isso, no sistema novo:

**nenhum agregado (positivação, distribuição, financeiro, ranking) é copiado ou hardcoded — tudo é calculado ao
vivo via view/query sobre a tabela `vendas`.** Ver `04-regras-de-negocio.md` e `02-banco-de-dados.md`.
