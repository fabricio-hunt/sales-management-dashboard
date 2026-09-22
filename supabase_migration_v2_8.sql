-- ============================================================================
-- Migration v2.8 — Resumo da Distribuição por equipe (Fase 4)
-- Rodar no SQL Editor do Supabase. Idempotente (re-executável).
--
-- Contexto: pedido do cliente em 21/09 — Base Ativa (cadastro), "o que está
-- ativo", Meta e Realizado, agrupados por equipe. Decisões tomadas sem
-- resposta do cliente (ele está difícil de acessar — ver
-- docs/plano-implementacao-equipes.md):
--   - "Meta"/"Realizado" = Obj. Positivação / positivação realizada (mesmo
--     par que já existe no card "Positivação de Clientes" de /equipe, só
--     agregado por equipe em vez de por representante/escopo selecionado).
--   - "O que está ativo" = clientes com pelo menos 1 venda no mês corrente
--     (distinto de "Base Ativa", que é cadastro — clientes.status='ativo').
--     Vira dado novo, não existia. Assumido "mês corrente" como período por
--     falta de confirmação — mesmo padrão de MesFilter usado em todo o
--     resto do sistema.
--   - Resumo novo fica DENTRO de /distribuicao (nova seção, acima da tabela
--     que já existia) em vez de rota separada — o cliente chamou o pedido
--     de "Resumo da Distribuição", mesmo nome da tela existente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- vw_positivacao_equipe — por equipe x mês: clientes distintos que compraram
-- (clientes_ativos) e clientes distintos com is_positivacao=1 (positivados).
-- COUNT DISTINCT direto na fato, mesmo cuidado do vw_realizado_equipe_fornecedor
-- (v1) e vw_vendas_mensal_resumo (v2.5): somar por representante contaria
-- duas vezes um cliente que comprou de mais de um representante da mesma
-- equipe.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_positivacao_equipe
WITH (security_invoker = true) AS
SELECT
  r.equipe_id,
  date_trunc('month', v.data_venda)::date AS mes,
  COUNT(DISTINCT v.cliente_id) AS clientes_ativos,
  COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.is_positivacao = 1) AS positivados
FROM public.vendas v
JOIN public.representantes r ON r.id = v.representante_id
WHERE r.equipe_id IS NOT NULL
GROUP BY r.equipe_id, date_trunc('month', v.data_venda)::date;
