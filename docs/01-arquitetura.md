# Arquitetura do Sistema

O **Commercial Management Dashboard** é um sistema moderno de análise e gestão comercial, desenhado para lidar com grandes volumes de dados (extraídos de ERPs através de planilhas) e fornecer painéis dinâmicos e rápidos.

## Tecnologias Utilizadas

- **Frontend:** Next.js (React) com App Router. Garante alta performance, SEO e roteamento inteligente.
- **Estilização:** Tailwind CSS. Framework utilitário para a criação rápida e escalável de interfaces, com o suporte de componentes do shadcn/ui.
- **Backend e Banco de Dados:** Supabase (PostgreSQL). Banco de dados relacional poderoso, permitindo buscas em milissegundos e suporte a ingestão massiva de dados.
- **Ícones:** Lucide React, garantindo uma linguagem visual unificada.

## Estrutura do Projeto

O projeto é centralizado na pasta dashboard/src:
- /app: Rotas principais da aplicação (Dashboard, Equipe, Analítico, Configurações).
- /components: Componentes reutilizáveis (Layout, UI base).
- /lib: Configurações utilitárias, como o cliente do Supabase (supabase.ts).
