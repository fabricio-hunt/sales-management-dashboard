// Reconfirma que nenhuma tabela é legível sem sessão (achado de 27/08, corrigido na v2.4).
// Uso: node scripts/security_audit_rls_anon.mjs

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

const TABELAS_QUE_DEVEM_EXIGIR_LOGIN = [
  "representantes", "produtos", "fornecedores", "fornecedor_aliases",
  "periodos", "metas", "metas_representante", "import_log",
  "vendas", "clientes", "profiles", "comissao_faixas",
  "modulos", "permissoes_role", "permissoes_usuario", "supervisor_representantes",
];

async function main() {
  let falhou = false;
  for (const tabela of TABELAS_QUE_DEVEM_EXIGIR_LOGIN) {
    const { count, error } = await supabase
      .from(tabela)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`OK  ${tabela}: erro esperado sem sessão (${error.message})`);
      continue;
    }
    if (count === 0) {
      console.log(`OK  ${tabela}: 0 linhas sem sessão`);
    } else {
      falhou = true;
      console.error(`FALHA  ${tabela}: ${count} linhas legíveis sem login!`);
    }
  }

  if (falhou) {
    console.error("\nFALHA — pelo menos uma tabela legível sem sessão. Corrigir policy antes de prosseguir.");
    process.exit(1);
  }
  console.log("\nOK — nenhuma tabela legível sem sessão.");
}

main();
