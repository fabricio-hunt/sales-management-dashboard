import { createClient } from "@supabase/supabase-js"

// A criação do client é adiada pro primeiro uso (em vez de rodar na avaliação
// do módulo) porque o Next, durante o build, importa páginas e route handlers
// pra coletar metadata — sem isso, um build sem as env vars configuradas
// (ex.: preview na Vercel) falha mesmo que o client nunca seja usado.
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
      "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

type SupabaseClient = ReturnType<typeof createSupabaseClient>

let client: SupabaseClient | undefined

function getClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient()
  }
  return client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
