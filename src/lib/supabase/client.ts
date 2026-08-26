"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase pro browser, ligado à sessão via cookies (substitui o uso
// direto de src/lib/supabase.ts nas telas client component que leem tabela
// com RLS escopada por auth.uid()). Uma instância por módulo, como o padrão
// já usado em src/lib/supabase.ts / supabaseAdmin.ts.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
