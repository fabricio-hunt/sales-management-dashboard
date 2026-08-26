// One-time seed: cria o primeiro usuário Manager, necessário porque sem
// nenhum usuário cadastrado ninguém consegue logar pra criar os demais (ver
// supabase_migration_v2.sql — profiles/permissoes_role/etc precisam já
// estar aplicadas antes de rodar isso).
//
// Uso: node scripts/seed_first_manager.mjs <email> <senha> "<nome>"
//
// Idempotente: se o e-mail já existir no Auth, só garante que o profile dele
// existe com role=manager (não duplica usuário nem falha).

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Faltando NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY em .env.local.\n" +
    "Pegue a service_role key em: Supabase Dashboard > Project Settings > API."
  );
  process.exit(1);
}

const [, , email, senha, ...nomeParts] = process.argv;
const nome = nomeParts.join(" ");

if (!email || !senha || !nome) {
  console.error('Uso: node scripts/seed_first_manager.mjs <email> <senha> "<nome>"');
  process.exit(1);
}
if (senha.length < 6) {
  console.error("A senha precisa ter pelo menos 6 caracteres (mínimo do Supabase Auth).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: existentes, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  let userId = existentes.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;

  if (userId) {
    console.log(`Usuário ${email} já existe no Auth (id=${userId}), reaproveitando.`);
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (createError) throw createError;
    userId = created.user.id;
    console.log(`Usuário criado no Auth: ${email} (id=${userId}).`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, nome, role: "manager", representante_id: null, ativo: true }, { onConflict: "id" });
  if (profileError) throw profileError;

  console.log(`Profile "manager" garantido pra ${nome} <${email}>. Login já pode ser feito em /login.`);
}

main().catch((err) => {
  console.error("Falha ao criar o primeiro manager:", err.message ?? err);
  process.exit(1);
});
