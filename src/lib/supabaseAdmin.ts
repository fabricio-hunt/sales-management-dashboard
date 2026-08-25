import { createClient } from "@supabase/supabase-js";

// Cliente com service role key — SÓ pode ser importado em código server-side
// (Route Handlers, Server Actions). A RLS do banco não tem policy de escrita
// pro role "anon", então toda escrita (import, metas, clientes, fornecedores)
// precisa passar por aqui. Nunca exponha SUPABASE_SERVICE_ROLE_KEY como
// NEXT_PUBLIC_* — isso vazaria a chave no bundle do browser.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase admin environment variables. " +
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local " +
    "(a service_role key fica em Project Settings > API no painel do Supabase)."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
