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
```

### 4. Set up the database

Run the SQL script in `supabase_schema.sql` inside the **Supabase SQL Editor** of your project.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Dashboard Overview:** KPIs for total revenue, orders, active clients, and average margin.
- **Admin Upload:** Drag & drop Excel (`.xlsx`) upload with browser-side parsing and batch insert to Supabase in chunks of 500 records.
- **Sidebar Navigation:** Fast client-side routing with active link highlighting.

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Dashboard overview
│   ├── admin/page.tsx    # Excel upload & sync
│   └── layout.tsx        # Root layout (Sidebar + Toaster)
├── components/
│   └── layout/Sidebar.tsx
└── lib/
    └── supabase.ts       # Supabase client
supabase_schema.sql       # DB schema (run once in Supabase SQL Editor)
```
