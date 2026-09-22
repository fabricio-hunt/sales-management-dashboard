// One-time seed: cria as 6 equipes confirmadas nas planilhas de equipe-de-vendas/
// (92, 93, 94, 95, 96, 97) com cor fixa aprovada pelo cliente em 22/09/2026 —
// reaproveita a mesma chartPalette (8 cores) já validada contra daltonismo que o
// dashboard usa nos gráficos (src/lib/design-tokens.ts). Ver docs/PENDENCIAS.md e
// docs/08-refinamento-graficos-equipes-metas.md.
//
// Também vincula representantes.equipe_id para a equipe 94 (Jundiaí) — os únicos
// 7 representantes que já existem no banco hoje (308/310/312/401/407/408/90). As
// outras 5 equipes ficam sem representante vinculado até as planilhas delas
// passarem pelo import mensal (nunca foram importadas — só agosto/2026 da
// equipe 94 está no banco).
//
// supervisor_id fica NULL em todas — ainda não sabemos quem é o supervisor de
// cada equipe (pergunta de acompanhamento em aberto).
//
// Pré-requisitos:
//   1. supabase_migration_v2_6.sql já rodada (confirmado em produção em 22/09).
//   2. SUPABASE_SERVICE_ROLE_KEY em .env.local.
//
// Uso: node scripts/seed_equipes_v1.mjs
// Idempotente: upsert em equipes, update condicional em representantes.

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Mesma ordem/cores de src/lib/design-tokens.ts (chartPalette) — não reordenar.
const EQUIPES = [
  { id: "92", cor: "#2a78d6" }, // azul — Campinas
  { id: "93", cor: "#eb6834" }, // laranja — Sorocaba
  { id: "94", cor: "#1baf7a" }, // verde-água — Jundiaí
  { id: "95", cor: "#eda100" }, // amarelo — EQ. SP
  { id: "96", cor: "#e87ba4" }, // magenta — EQ. Sul
  { id: "97", cor: "#008300" }, // verde — EQ. Itape
];

const REPRESENTANTES_EQUIPE_94 = ["308", "310", "312", "401", "407", "408", "90"];

async function main() {
  const { error: equipesErr } = await supabase.from("equipes").upsert(EQUIPES, { onConflict: "id" });
  if (equipesErr) {
    console.error("Erro ao gravar equipes:", equipesErr.message);
    process.exit(1);
  }
  console.log(`✓ ${EQUIPES.length} equipes gravadas (92-97, cor fixa).`);

  const { error: repsErr, count } = await supabase
    .from("representantes")
    .update({ equipe_id: "94" })
    .in("id", REPRESENTANTES_EQUIPE_94)
    .select("id", { count: "exact" });
  if (repsErr) {
    console.error("Erro ao vincular representantes da equipe 94:", repsErr.message);
    process.exit(1);
  }
  console.log(`✓ ${count ?? "?"} representantes vinculados à equipe 94.`);

  console.log(
    "\nNota: 92/93/95/96/97 ficaram sem representante vinculado — as planilhas dessas " +
    "equipes nunca passaram pelo import mensal (só agosto/2026 da equipe 94 está no banco)."
  );
}

main();
