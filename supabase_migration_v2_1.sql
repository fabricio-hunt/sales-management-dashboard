-- ============================================================================
-- Migration v2.1 — Lançamento manual de vendas (/admin/vendas)
-- Rode DEPOIS de supabase_migration_v2.sql (mesma lógica de v1 -> v1.1: só
-- adiciona o que faltou, não repete nada do arquivo anterior).
--
-- Pedido do cliente: vendedor precisa conseguir "lançar e acompanhar vendas"
-- sem depender do import mensal do DD PEDIDOS. A venda lançada na mão grava
-- direto em public.vendas (mesma tabela fato de sempre) — /equipe, rankings,
-- comissão etc. continuam funcionando sem nenhuma mudança, porque tudo já é
-- calculado ao vivo a partir dessa tabela.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Origem da linha — sem isso, o próximo import do DD PEDIDOS (que faz
--    delete-and-reinsert por período/representante via apagar_vendas_periodo)
--    apagaria os lançamentos manuais do mês junto.
-- ----------------------------------------------------------------------------

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'erp' CHECK (origem IN ('erp', 'manual'));

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
     AND representante_id = ANY(p_representante_ids)
     AND origem = 'erp'; -- nunca apaga lançamento manual
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Numeração de pedido pros lançamentos manuais (o ERP não manda um pra
--    gente nesse caso). Uma chamada por lançamento (não por item), pra vários
--    produtos do mesmo lançamento compartilharem o mesmo "pedido".
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.manual_pedido_seq START 1;

CREATE OR REPLACE FUNCTION public.gerar_pedido_manual()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'MANUAL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.manual_pedido_seq')::text, 5, '0');
$$;

-- ----------------------------------------------------------------------------
-- 3. Vendedor passa a ter acesso de edição ao módulo de lançamento (era só
--    dashboard/equipe/comissões até aqui — "lançar venda" é core pro papel).
-- ----------------------------------------------------------------------------

INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('vendedor', 'admin.vendas', 'editar')
ON CONFLICT (role, modulo_slug) DO UPDATE SET nivel = EXCLUDED.nivel;
