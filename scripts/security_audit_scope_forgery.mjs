// Loga como Vendedor e Supervisor de teste e tenta ler/escrever fora do escopo,
// simulando filtro/query param manipulado. Fecha o item 7 de docs/PENDENCIAS.md (27/08).
// Uso: node scripts/security_audit_scope_forgery.mjs

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}

const REQUIRED_TEST_VARS = [
  "TEST_VENDEDOR_EMAIL", "TEST_VENDEDOR_PASSWORD",
  "TEST_SUPERVISOR_EMAIL", "TEST_SUPERVISOR_PASSWORD",
];
const faltando = REQUIRED_TEST_VARS.filter((v) => !process.env[v]);
if (faltando.length > 0) {
  console.error(`Faltando em .env.local: ${faltando.join(", ")}`);
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function logarComo(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falhou para ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

async function testarEscopo(nome, client, representanteIdEsperado, representantesPermitidos) {
  let ok = true;

  for (const tabela of ["vendas", "clientes", "metas"]) {
    const { data, error } = await client.from(tabela).select("representante_id");
    if (error) {
      console.log(`OK  [${nome}] ${tabela}: erro ao ler (${error.message})`);
      continue;
    }
    const foraDeEscopo = data.filter((r) => !representantesPermitidos.includes(r.representante_id));
    if (foraDeEscopo.length > 0) {
      ok = false;
      console.error(`FALHA  [${nome}] ${tabela}: ${foraDeEscopo.length} linhas fora do escopo!`);
    } else {
      console.log(`OK  [${nome}] ${tabela}: ${data.length} linhas, todas dentro do escopo`);
    }
  }

  // Tentativa de escrita direta (sem passar pela Server Action) — deve falhar por policy.
  const { error: insertError } = await client.from("vendas").insert({
    representante_id: representanteIdEsperado,
    data_venda: "2026-01-01",
    venda_liq: 1,
    qtde: 1,
  });
  if (insertError) {
    console.log(`OK  [${nome}] insert direto em vendas bloqueado (${insertError.message})`);
  } else {
    ok = false;
    console.error(`FALHA  [${nome}] insert direto em vendas foi aceito sem passar pela Server Action!`);
    // Reverter o insert de teste que vazou, pra não sujar produção.
    await admin.from("vendas").delete()
      .eq("representante_id", representanteIdEsperado)
      .eq("data_venda", "2026-01-01")
      .eq("venda_liq", 1)
      .eq("qtde", 1);
  }

  return ok;
}

async function main() {
  let tudoOk = true;

  // --- Vendedor ---
  const vendedor = await logarComo(process.env.TEST_VENDEDOR_EMAIL, process.env.TEST_VENDEDOR_PASSWORD);
  const { data: profileVendedor } = await admin
    .from("profiles")
    .select("representante_id")
    .eq("id", vendedor.userId)
    .single();
  tudoOk = (await testarEscopo("Vendedor", vendedor.client, profileVendedor.representante_id, [profileVendedor.representante_id])) && tudoOk;

  // supabase.rpc direto na função SECURITY DEFINER
  const { data: podeProprio } = await vendedor.client.rpc("pode_ver_representante", { p_representante_id: profileVendedor.representante_id });
  const { data: podeOutro } = await vendedor.client.rpc("pode_ver_representante", { p_representante_id: "___id_de_outro_representante___" });
  console.log(podeProprio === true ? "OK  [Vendedor] pode_ver_representante(próprio) = true" : "FALHA  pode_ver_representante(próprio) deveria ser true");
  console.log(podeOutro === false ? "OK  [Vendedor] pode_ver_representante(outro) = false" : "FALHA  pode_ver_representante(outro) deveria ser false");
  tudoOk = tudoOk && podeProprio === true && podeOutro === false;

  // --- Supervisor ---
  const supervisor = await logarComo(process.env.TEST_SUPERVISOR_EMAIL, process.env.TEST_SUPERVISOR_PASSWORD);
  const { data: profileSupervisor } = await admin
    .from("profiles")
    .select("id")
    .eq("id", supervisor.userId)
    .single();
  const { data: atribuidos } = await admin
    .from("supervisor_representantes")
    .select("representante_id")
    .eq("supervisor_id", profileSupervisor.id);
  const idsPermitidos = atribuidos.map((r) => r.representante_id);
  if (idsPermitidos.length === 0) {
    console.log("AVISO  [Supervisor] nenhuma atribuição em supervisor_representantes — teste de escopo pulado para este perfil.");
  } else {
    tudoOk = (await testarEscopo("Supervisor", supervisor.client, idsPermitidos[0], idsPermitidos)) && tudoOk;
  }

  if (!tudoOk) {
    console.error("\nFALHA — vazamento de escopo encontrado. Corrigir RLS antes de fechar a sessão.");
    process.exit(1);
  }
  console.log("\nOK — nenhum vazamento de escopo encontrado.");
}

main().catch((err) => {
  console.error("Erro ao rodar a varredura:", err.message ?? err);
  process.exit(1);
});
