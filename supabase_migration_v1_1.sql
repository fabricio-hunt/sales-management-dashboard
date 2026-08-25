-- ============================================================================
-- Migration v1.1 — Histórico de importação
-- Rode DEPOIS de supabase_schema.sql e supabase_migration_v1.sql.
-- Adiciona só a tabela de auditoria usada pelos 4 pipelines de import
-- (vendas/fornecedores/clientes/metas, ver src/app/api/admin/import/*).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.import_log (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('vendas', 'fornecedores', 'clientes', 'metas')),
  arquivo_nome TEXT,
  executado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  sucesso BOOLEAN NOT NULL,
  linhas_processadas INT NOT NULL DEFAULT 0,
  linhas_ignoradas INT NOT NULL DEFAULT 0,
  periodo_inicio DATE,
  periodo_fim DATE,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_import_log_executado_em ON public.import_log (executado_em DESC);

ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica import_log" ON public.import_log FOR SELECT USING (true);

-- Nenhuma policy de INSERT pro role anon: só a service role key (usada pelas
-- rotas de import) grava aqui, mesma regra do resto do schema v1.
