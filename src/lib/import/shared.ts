import * as xlsx from "xlsx";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helpers compartilhados pelas 4 rotas de import (vendas/fornecedores/clientes/metas)
// em src/app/api/admin/import/*/route.ts.

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function toFloat(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Extrai o ID numérico do início de um campo "Representante" (ex: "308 - Fulano" -> "308").
export function parseRepresentante(raw: unknown): { id: string; nome: string } | null {
  const str = String(raw ?? "").trim();
  if (!str) return null;
  const match = str.match(/^(\d+)/);
  const id = match ? match[1] : str;
  return { id, nome: str };
}

// Parse simples: primeira aba, cabeçalho na primeira linha — usado pelos templates
// que o próprio sistema gera (fornecedores/clientes/metas), ao contrário do DD
// PEDIDOS do ERP (que tem título/linhas em branco antes do cabeçalho real).
export function parseFirstSheetRows(buffer: Buffer): Record<string, unknown>[] {
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

export type LogImportEntry = {
  tipo: "vendas" | "fornecedores" | "clientes" | "metas";
  arquivo_nome: string | null;
  sucesso: boolean;
  linhas_processadas?: number;
  linhas_ignoradas?: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  detalhes?: Record<string, unknown>;
};

// Nunca lança — registrar o histórico não pode derrubar um import que já deu certo.
export async function logImport(entry: LogImportEntry): Promise<void> {
  try {
    await supabaseAdmin.from("import_log").insert({
      tipo: entry.tipo,
      arquivo_nome: entry.arquivo_nome,
      sucesso: entry.sucesso,
      linhas_processadas: entry.linhas_processadas ?? 0,
      linhas_ignoradas: entry.linhas_ignoradas ?? 0,
      periodo_inicio: entry.periodo_inicio ?? null,
      periodo_fim: entry.periodo_fim ?? null,
      detalhes: entry.detalhes ?? {},
    });
  } catch (err) {
    console.error("Falha ao gravar import_log:", err);
  }
}
