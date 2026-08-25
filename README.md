# Commercial Management — Sales Dashboard

A commercial management dashboard built with **Next.js 16**, **Supabase**, and **Recharts** for visualizing sales data from ERP-generated Excel reports.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI:** Shadcn/ui + Tailwind CSS v4
- **Charts:** Recharts
- **Excel Parsing:** xlsx (browser-side)
- **Notifications:** Sonner

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/fabricio-hunt/sales-management-dashboard.git
cd sales-management-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key (Project Settings > API) is required — all writes (import, metas, admin CRUD) go through
Server Actions/Route Handlers using it, since RLS only allows public `SELECT`.

### 4. Set up the database

Run, in order, in the **Supabase SQL Editor**:

1. `supabase_schema.sql` — base tables.
2. `supabase_migration_v1.sql` — metas/fornecedores/periodos tables, aggregation views, RLS lockdown, import RPCs.
3. `supabase_migration_v1_1.sql` — `import_log` table (import history/audit).

Then seed the current month's goals from the spreadsheet (one-time, idempotent):

```bash
node scripts/seed_metas_v1.mjs
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **`/equipe`** (and `/equipe?rep=<id>`): team/rep scorecards — goals, positivação, financeiro — computed live
  from `vendas`, never hardcoded.
- **`/admin/importar`:** hub of 4 independent imports (Node/TS, `/api/admin/import/{vendas,fornecedores,clientes,metas}`),
  each with its own template/guardrails. Vendas is delete-and-reinsert (idempotent per period, the only
  destructive one); fornecedores/clientes/metas are additive upserts. Import history in `import_log`, shown
  on the page. See `docs/03-importacao-excel.md`.
- **`/admin/metas`, `/admin/fornecedores`, `/admin/clientes`, `/admin/representantes`, `/configuracoes`:** CRUD for
  everything that used to be hardcoded in source. `/admin/metas` also has "copy previous month" + "save all".
- Analytics, rankings, distribution and a Curva ABC de Produtos page — see `docs/05-componentes-e-layout.md` for
  the full route inventory.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard hub
│   ├── equipe/page.tsx       # Team/rep scorecards
│   ├── admin/actions.ts      # All write Server Actions (service role)
│   ├── admin/importar/       # Import hub page + ImportHub client component
│   ├── api/admin/import/     # 4 import endpoints (vendas/fornecedores/clientes/metas)
│   └── layout.tsx            # Root layout (Sidebar + Toaster)
├── components/
│   └── layout/Sidebar.tsx
└── lib/
    ├── supabase.ts           # Anon client (read)
    ├── supabaseAdmin.ts      # Service role client (server-only writes)
    └── import/                # expectedColumns.ts + shared.ts (parse/upsert/log helpers)
supabase_schema.sql          # Base schema
supabase_migration_v1.sql    # v1 schema/views/RLS/RPCs
supabase_migration_v1_1.sql  # import_log table
scripts/seed_metas_v1.mjs    # One-time seed of metas from the spreadsheet
```
