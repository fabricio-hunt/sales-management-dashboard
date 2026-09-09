-- ============================================================================
-- Migration v2.5 — Comparativo Anual (view mensal + módulo novo)
-- Rodar no SQL Editor do Supabase. Idempotente (re-executável).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Resumo mensal (mes x representante) — alimenta o Comparativo Anual.
--
--    WITH (security_invoker = true) é obrigatório: sem isso a view roda com os
--    privilégios do dono e ignora silenciosamente o escopo por representante
--    de pode_ver_representante() (mesmo cuidado do item 6 da v1 e do
--    vw_top_clientes_mes na v2).
--
--    Não expõe "clientes positivados" agregável por ano diretamente: somar
--    COUNT(DISTINCT cliente_id) de meses diferentes duplicaria cliente que
--    comprou em mais de um mês. Esta view serve o gráfico mês a mês (onde
--    positivação por mês é a granularidade certa, igual vw_positivacao_representante)
--    e os KPIs de faturamento/devolução (soma simples, aditiva entre meses).
--    O KPI anual de clientes positivados é calculado direto em vendas, na
--    própria página (COUNT(DISTINCT) não existe no PostgREST — deduplicação
--    roda em JS sobre o cliente_id de cada linha do ano).
--
--    Deliberadamente NÃO depende de periodos: essa tabela exige cadastro
--    manual por mês e não pode bloquear a comparação de um ano que ainda não
--    tem nenhum período registrado (ex.: 2027).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_vendas_mensal_resumo
WITH (security_invoker = true) AS
SELECT
  date_trunc('month', v.data_venda)::date AS mes,
  v.representante_id,
  SUM(v.venda_liq) AS venda_liq,
  SUM(v.venda_bruta) AS venda_bruta,
  SUM(v.devolucao) AS devolucao,
  COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.is_positivacao = 1) AS positivados,
  COUNT(DISTINCT v.pedido_nr) AS pedidos
FROM public.vendas v
GROUP BY 1, 2;

-- ----------------------------------------------------------------------------
-- 2. Módulo novo na matriz de permissões
-- ----------------------------------------------------------------------------

INSERT INTO public.modulos (slug, label, grupo, rota) VALUES
  ('comparativo.anual', 'Comparativo Anual', 'Distribuição & Evolução', '/comparativo-anual')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, grupo = EXCLUDED.grupo, rota = EXCLUDED.rota;

-- Manager: editar (documentativo — a app já libera manager sem consultar essa
-- tabela, ver src/lib/auth/permissions.ts; explícito aqui porque o bulk insert
-- da v2 já rodou uma vez e não é reexecutado a cada módulo novo).
INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('manager', 'comparativo.anual', 'editar')
ON CONFLICT (role, modulo_slug) DO UPDATE SET nivel = EXCLUDED.nivel;

-- Supervisor: visualizar — mesmo padrão dos outros módulos analíticos/de
-- gestão do grupo "Distribuição & Evolução" (distribuicao, evolucao).
-- Vendedor NÃO recebe linha — mesma restrição já aplicada a esse papel
-- (vendedor só tem dashboard/equipe/comissoes, ver v1 item 2).
INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('supervisor', 'comparativo.anual', 'visualizar')
ON CONFLICT (role, modulo_slug) DO UPDATE SET nivel = EXCLUDED.nivel;
