import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase ligado à sessão do usuário logado (cookies), usado em Server
// Components, Server Actions e Route Handlers. Substitui o client anon puro de
// src/lib/supabase.ts em todo lugar que lê tabela com RLS escopada por
// auth.uid() (vendas, clientes) — sem a sessão, essas leituras voltam vazias.
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component chamando setAll: ignorado, o middleware já
            // renova a sessão a cada request (ver src/proxy.ts).
          }
        },
      },
    }
  );
}
