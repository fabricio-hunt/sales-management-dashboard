"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/auth/permissions";
import { tokens } from "@/lib/design-tokens";

// Gestão de equipes é restrita ao Manager (mesmo padrão de admin/usuarios —
// atribuir supervisor a uma equipe determina o que aquela pessoa enxerga no
// sistema inteiro via pode_ver_representante(), não é algo delegável pela
// matriz de permissões). Ver docs/plano-implementacao-equipes.md.

export type EquipeComDetalhes = {
  id: string;
  cor: string;
  supervisor_id: string | null;
  supervisor_nome: string | null;
  representantes_count: number;
};

export type SupervisorDisponivel = { id: string; nome: string; equipe_atual: string | null };

export type RepresentanteComEquipe = { id: string; nome: string; equipe_id: string | null };

export async function listarEquipes(): Promise<EquipeComDetalhes[]> {
  await requireRole(["manager"]);

  const [{ data: equipes, error: eqErr }, { data: profiles, error: pErr }, { data: reps, error: rErr }] = await Promise.all([
    supabaseAdmin.from("equipes").select("id, cor, supervisor_id").order("id"),
    supabaseAdmin.from("profiles").select("id, nome").eq("role", "supervisor"),
    supabaseAdmin.from("representantes").select("id, equipe_id"),
  ]);
  if (eqErr) throw new Error(eqErr.message);
  if (pErr) throw new Error(pErr.message);
  if (rErr) throw new Error(rErr.message);

  const nomePorSupervisor = new Map((profiles ?? []).map((p) => [p.id, p.nome]));
  const countPorEquipe = new Map<string, number>();
  for (const r of reps ?? []) {
    if (!r.equipe_id) continue;
    countPorEquipe.set(r.equipe_id, (countPorEquipe.get(r.equipe_id) ?? 0) + 1);
  }

  return (equipes ?? []).map((e) => ({
    id: e.id,
    cor: e.cor,
    supervisor_id: e.supervisor_id,
    supervisor_nome: e.supervisor_id ? (nomePorSupervisor.get(e.supervisor_id) ?? "(usuário removido)") : null,
    representantes_count: countPorEquipe.get(e.id) ?? 0,
  }));
}

// Todo usuário role=supervisor, marcando se já está em alguma equipe — pro
// dropdown desabilitar/avisar (o banco também impede via UNIQUE, isso é só UX).
export async function listarSupervisoresDisponiveis(): Promise<SupervisorDisponivel[]> {
  await requireRole(["manager"]);
  const [{ data: profiles, error: pErr }, { data: equipes, error: eErr }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, nome").eq("role", "supervisor").order("nome"),
    supabaseAdmin.from("equipes").select("id, supervisor_id").not("supervisor_id", "is", null),
  ]);
  if (pErr) throw new Error(pErr.message);
  if (eErr) throw new Error(eErr.message);

  const equipePorSupervisor = new Map((equipes ?? []).map((e) => [e.supervisor_id as string, e.id]));
  return (profiles ?? []).map((p) => ({ id: p.id, nome: p.nome, equipe_atual: equipePorSupervisor.get(p.id) ?? null }));
}

export async function listarRepresentantesComEquipe(): Promise<RepresentanteComEquipe[]> {
  await requireRole(["manager"]);
  const { data, error } = await supabaseAdmin.from("representantes").select("id, nome, equipe_id").order("id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Cor não é escolhida pelo usuário (decisão do cliente, 22/09: "sistema
// define"/"cor fixa") — pega a próxima cor da chartPalette ainda não usada
// por nenhuma equipe. Se as 8 cores já estiverem em uso, repete a partir da
// primeira (não deveria acontecer com só 7 equipes esperadas).
export async function criarEquipe(id: string): Promise<void> {
  await requireRole(["manager"]);
  const numero = id.trim();
  if (!/^\d+$/.test(numero)) throw new Error("Número da equipe deve ser só dígitos (ex: 98).");

  const { data: existentes, error: exErr } = await supabaseAdmin.from("equipes").select("cor").order("created_at");
  if (exErr) throw new Error(exErr.message);

  const usadas = new Set((existentes ?? []).map((e) => e.cor));
  const palette = tokens.colors.chartPalette;
  const cor = palette.find((c) => !usadas.has(c)) ?? palette[(existentes?.length ?? 0) % palette.length];

  const { error } = await supabaseAdmin.from("equipes").insert({ id: numero, cor });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/equipes");
}

export async function atualizarSupervisorEquipe(equipeId: string, supervisorId: string | null): Promise<void> {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.from("equipes").update({ supervisor_id: supervisorId }).eq("id", equipeId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/equipes");
}

export async function reatribuirRepresentante(representanteId: string, equipeId: string | null): Promise<void> {
  await requireRole(["manager"]);
  const { error } = await supabaseAdmin.from("representantes").update({ equipe_id: equipeId }).eq("id", representanteId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/equipes");
}
