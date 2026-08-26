import { createClient } from "@supabase/supabase-js";

// Cliente com service role key — SÓ pode ser importado em código server-side
// (Route Handlers, Server Actions). A RLS do banco não tem policy de escrita
// pro role "anon", então toda escrita (import, metas, clientes, fornecedores)
// precisa passar por aqui. Nunca exponha SUPABASE_SERVICE_ROLE_KEY como
// NEXT_PUBLIC_* — isso vazaria a chave no bundle do browser.

// A criação do client é adiada pro primeiro uso (em vez de rodar na avaliação
// do módulo) porque o Next, durante o build, importa os route handlers pra
// coletar metadata das rotas — sem isso, um build sem as env vars configuradas
// (ex.: preview na Vercel) falha mesmo que a rota nunca seja chamada.
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local " +
      "(a service_role key fica em Project Settings > API no painel do Supabase)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

type AdminClient = ReturnType<typeof createAdminClient>;

let client: AdminClient | undefined;

function getClient(): AdminClient {
  if (!client) {
    client = createAdminClient();
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
