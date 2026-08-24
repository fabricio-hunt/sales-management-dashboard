# Componentes e Layout

A UI do sistema foca em ser limpa e executiva, ideal para apresentações.

## Menu Lateral (Sidebar)
Arquivo: \src/components/layout/Sidebar.tsx\
- Possui modo responsivo: Menu hamburguer no mobile e menu expansivo (fixed) no Desktop.
- Organizado em grupos como: *Dashboard, Dados Analíticos, Rankings, Distribuição & Evolução, Uso Interno*.
- O topo exibe de maneira arredondada a marca configurada (via classe CSS \ounded-full\).

## Cartões de Indicadores (Scorecards)
Tabelas condensadas utilizando os componentes \Card\ do \shadcn/ui\. A cor de fundo (\g-yellow-50\ ou \g-amber-50\) e do texto (\	ext-emerald-600\) é tratada condicionalmente dependendo de o número real ter alcançado a projeção ideal de vendas/mês.
