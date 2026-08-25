-- ============================================================================
-- Migration v1 — Sistema de Gestão Comercial
-- Rode isso no SQL Editor do Supabase DEPOIS de já ter rodado supabase_schema.sql
-- Elimina os hardcodes de src/app/equipe/page.tsx (METAS_FORNECEDOR,
-- NOME_BANCO_PARA_PLANILHA, PERIODO, REALIZADO_POSITIVACAO_MANUAL) movendo
-- tudo pra tabelas/views editáveis via UI e calculadas ao vivo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fornecedores + mapeamento de razão social do ERP
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id SERIAL PRIMARY KEY,
  nome_fantasia TEXT UNIQUE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fornecedor_aliases (
  id SERIAL PRIMARY KEY,
  fornecedor_id INT NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  razao_social_erp TEXT UNIQUE NOT NULL, -- sempre armazenado em UPPER(TRIM(...))
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 2. Período mensal (substitui o objeto PERIODO hardcoded)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.periodos (
  mes DATE PRIMARY KEY, -- sempre dia 1, ex: 2026-08-01
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_uteis INT NOT NULL,
  regiao TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 3. Metas por representante x fornecedor x mês (granularidade real da planilha)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.metas (
  id SERIAL PRIMARY KEY,
  mes DATE NOT NULL REFERENCES public.periodos(mes) ON DELETE CASCADE,
  representante_id TEXT NOT NULL REFERENCES public.representantes(id) ON DELETE CASCADE,
  fornecedor_id INT NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  meta_cx NUMERIC(15,4) NOT NULL DEFAULT 0,
  meta_dia_cx NUMERIC(15,4) NOT NULL DEFAULT 0,
  meta_fin NUMERIC(15,2) NOT NULL DEFAULT 0,
  preco_medio NUMERIC(15,2) NOT NULL DEFAULT 0,
  desafio_dist INT NOT NULL DEFAULT 0,
  premiacao_pct_cx NUMERIC(6,4) NOT NULL DEFAULT 0,
  premiacao_pct_fin NUMERIC(6,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (mes, representante_id, fornecedor_id)
);

-- ----------------------------------------------------------------------------
-- 4. Alterações em tabelas existentes
-- ----------------------------------------------------------------------------

ALTER TABLE public.produtos  ADD COLUMN IF NOT EXISTS fornecedor_id INT REFERENCES public.fornecedores(id);
ALTER TABLE public.clientes  ADD COLUMN IF NOT EXISTS representante_id TEXT REFERENCES public.representantes(id);
ALTER TABLE public.clientes  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo'));
ALTER TABLE public.vendas    ADD COLUMN IF NOT EXISTS seq_erp TEXT;
ALTER TABLE public.vendas    ADD COLUMN IF NOT EXISTS motivo_devolucao TEXT;

-- Metas/objetivos por representante (não por fornecedor) — Obj. Positivação
-- de cada aba individual (140, 85, 85...), e um override manual de
-- cadastro_total/base_ativa (a origem exata desses dois números no ERP não
-- foi confirmada com o cliente — ver ressalva no plano).
CREATE TABLE IF NOT EXISTS public.metas_representante (
  mes DATE NOT NULL REFERENCES public.periodos(mes) ON DELETE CASCADE,
  representante_id TEXT NOT NULL REFERENCES public.representantes(id) ON DELETE CASCADE,
  obj_positivacao INT NOT NULL DEFAULT 0,
  cadastro_total_override INT,
  base_ativa_override INT,
  premiacao_pct_positivacao_base NUMERIC(6,4) DEFAULT 0, -- taxa-base do cabeçalho da aba (distinta da taxa por fornecedor em metas.premiacao_pct_cx — fórmula de comissão final ainda não confirmada com o cliente)
  premiacao_pct_financeiro_base NUMERIC(6,4) DEFAULT 0,
  PRIMARY KEY (mes, representante_id)
);

-- ----------------------------------------------------------------------------
-- 5. Índices de performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON public.vendas (data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_rep_data ON public.vendas (representante_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor ON public.produtos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_representante ON public.clientes (representante_id);

-- ----------------------------------------------------------------------------
-- 6. Views de agregação — nunca mais copiar/hardcodar um agregado.
--    Tudo aqui é calculado ao vivo a partir de public.vendas.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_realizado_rep_fornecedor AS
SELECT
  date_trunc('month', v.data_venda)::date AS mes,
  v.representante_id,
  p.fornecedor_id,
  SUM(v.qtde) AS real_cx,
  SUM(v.venda_liq) AS real_fin,
  COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.is_positivacao = 1) AS positivados,
  COUNT(DISTINCT v.cliente_id) AS distribuidos
FROM public.vendas v
JOIN public.produtos p ON p.id = v.produto_id
WHERE p.fornecedor_id IS NOT NULL
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW public.vw_realizado_equipe_fornecedor AS
SELECT
  mes,
  fornecedor_id,
  SUM(real_cx) AS real_cx,
  SUM(real_fin) AS real_fin,
  -- soma de positivados por rep NÃO é positivação da equipe (um cliente pode
  -- comprar de 2 reps); recalcula direto da fato pra não repetir o erro da planilha
  (SELECT COUNT(DISTINCT v2.cliente_id)
     FROM public.vendas v2
     JOIN public.produtos p2 ON p2.id = v2.produto_id
    WHERE p2.fornecedor_id = vrf.fornecedor_id
      AND date_trunc('month', v2.data_venda)::date = vrf.mes
      AND v2.is_positivacao = 1) AS positivados,
  (SELECT COUNT(DISTINCT v2.cliente_id)
     FROM public.vendas v2
     JOIN public.produtos p2 ON p2.id = v2.produto_id
    WHERE p2.fornecedor_id = vrf.fornecedor_id
      AND date_trunc('month', v2.data_venda)::date = vrf.mes) AS distribuidos
FROM public.vw_realizado_rep_fornecedor vrf
GROUP BY mes, fornecedor_id;

CREATE OR REPLACE VIEW public.vw_faturamento_diario AS
SELECT
  v.data_venda,
  v.representante_id,
  SUM(v.venda_liq) AS venda_liq,
  SUM(v.venda_bruta) AS venda_bruta,
  SUM(v.devolucao) AS devolucao,
  COUNT(DISTINCT v.cliente_id) AS clientes_atendidos
FROM public.vendas v
GROUP BY v.data_venda, v.representante_id;

CREATE OR REPLACE VIEW public.vw_positivacao_representante AS
SELECT
  date_trunc('month', v.data_venda)::date AS mes,
  v.representante_id,
  COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.is_positivacao = 1) AS positivados
FROM public.vendas v
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.vw_financeiro_representante AS
SELECT
  date_trunc('month', v.data_venda)::date AS mes,
  v.representante_id,
  SUM(v.venda_liq) AS venda_liq
FROM public.vendas v
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.vw_vendas_cliente_dia AS
SELECT
  v.cliente_id,
  v.data_venda,
  SUM(v.venda_liq) AS venda_liq,
  SUM(v.devolucao) AS devolucao,
  SUM(v.qtde) AS qtde
FROM public.vendas v
GROUP BY v.cliente_id, v.data_venda;

-- ----------------------------------------------------------------------------
-- 7. RLS — fecha escrita anônima. Leitura continua pública (v1 não tem login).
--    Toda escrita (import, metas, clientes, fornecedores) passa a exigir a
--    service role key, usada só server-side (nunca no bundle do browser).
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir full access reps" ON public.representantes;
DROP POLICY IF EXISTS "Permitir full access clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir full access prod" ON public.produtos;
DROP POLICY IF EXISTS "Permitir full access vendas" ON public.vendas;

-- DROP IF EXISTS antes de cada CREATE POLICY torna o arquivo inteiro
-- re-executável com segurança (CREATE POLICY sozinho não é idempotente).
DROP POLICY IF EXISTS "Leitura publica representantes" ON public.representantes;
DROP POLICY IF EXISTS "Leitura publica clientes" ON public.clientes;
DROP POLICY IF EXISTS "Leitura publica produtos" ON public.produtos;
DROP POLICY IF EXISTS "Leitura publica vendas" ON public.vendas;

CREATE POLICY "Leitura publica representantes" ON public.representantes FOR SELECT USING (true);
CREATE POLICY "Leitura publica clientes"       ON public.clientes       FOR SELECT USING (true);
CREATE POLICY "Leitura publica produtos"       ON public.produtos       FOR SELECT USING (true);
CREATE POLICY "Leitura publica vendas"         ON public.vendas         FOR SELECT USING (true);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedor_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_representante ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Leitura publica aliases" ON public.fornecedor_aliases;
DROP POLICY IF EXISTS "Leitura publica periodos" ON public.periodos;
DROP POLICY IF EXISTS "Leitura publica metas" ON public.metas;
DROP POLICY IF EXISTS "Leitura publica metas_rep" ON public.metas_representante;

CREATE POLICY "Leitura publica fornecedores" ON public.fornecedores FOR SELECT USING (true);
CREATE POLICY "Leitura publica aliases"      ON public.fornecedor_aliases FOR SELECT USING (true);
CREATE POLICY "Leitura publica periodos"     ON public.periodos FOR SELECT USING (true);
CREATE POLICY "Leitura publica metas"        ON public.metas FOR SELECT USING (true);
CREATE POLICY "Leitura publica metas_rep"    ON public.metas_representante FOR SELECT USING (true);

-- Nenhuma policy de INSERT/UPDATE/DELETE é criada para o role anon em nenhuma
-- tabela: escrita só passa pela service role key (bypassa RLS por padrão no Supabase).

-- ----------------------------------------------------------------------------
-- 8. Funções de apoio ao import — idempotência e proteção de edição manual
-- ----------------------------------------------------------------------------

-- Apaga o período antes de reinserir (idempotência: reimportar o mesmo
-- DD PEDIDOS não duplica vendas). O insert em si é feito em lotes pela
-- aplicação logo em seguida (ver src/app/api/admin/import/route.ts) — separado
-- da delete pra não montar um único payload JSONB gigante por mês.
CREATE OR REPLACE FUNCTION public.apagar_vendas_periodo(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_representante_ids TEXT[]
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.vendas
   WHERE data_venda BETWEEN p_data_inicio AND p_data_fim
     AND representante_id = ANY(p_representante_ids);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Atribui representante_id só onde ainda está NULL — nunca sobrescreve um
-- ajuste manual feito em /admin/clientes.
CREATE OR REPLACE FUNCTION public.atribuir_representante_se_vazio(
  p_pares JSONB -- [{ "cliente_id": "123", "representante_id": "308" }, ...]
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.clientes c
     SET representante_id = x.representante_id
    FROM jsonb_to_recordset(p_pares) AS x(cliente_id TEXT, representante_id TEXT)
   WHERE c.id = x.cliente_id
     AND c.representante_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;
