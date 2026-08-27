-- ============================================================================
-- Migration v2.2 — Corrige recursão infinita de RLS em profiles
-- Rode DEPOIS de supabase_migration_v2.sql (e v2_1.sql).
--
-- BUG CORRIGIDO (bloqueava o login inteiro, achado em 27/08/2026):
-- As policies de SELECT de profiles / permissoes_usuario / supervisor_representantes
-- criadas na v2 faziam `EXISTS (SELECT 1 FROM public.profiles me WHERE ...)`
-- pra testar "sou manager?". O Postgres reaplica a policy de profiles a esse
-- subselect, que lê profiles de novo, e aborta com:
--
--     42P17 infinite recursion detected in policy for relation "profiles"
--
-- O `id = auth.uid() OR ...` do lado esquerdo NÃO evita isso — o comentário da
-- v2 ("seguro aqui pois não há recursão") estava errado.
--
-- Efeito prático: getCurrentProfile() (src/lib/auth/session.ts) recebia o erro,
-- descartava, devolvia null, e src/app/(app)/layout.tsx redirecionava pra
-- /login; o middleware via a sessão válida em /login e devolvia pra "/" —
-- loop de redirect infinito (ERR_TOO_MANY_REDIRECTS) logo após autenticar.
--
-- Correção: mover o teste "sou manager?" pra uma função SECURITY DEFINER, que
-- não dispara RLS ao ler profiles. É a mesma técnica que já era usada em
-- public.pode_ver_representante() na v2 — e é justamente por isso que
-- vendas/clientes nunca quebraram, só estas três tabelas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper — "o usuário logado é manager?" sem passar por RLS.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  );
$$;

REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Recria as três policies recursivas usando o helper.
--    profiles vira duas policies permissivas (OR entre si) em vez de um OR
--    dentro de uma só — mesma semântica, mais legível no dashboard do Supabase.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Leitura propria ou manager profiles" ON public.profiles;
DROP POLICY IF EXISTS "Leitura propria profiles" ON public.profiles;
DROP POLICY IF EXISTS "Leitura manager profiles" ON public.profiles;

CREATE POLICY "Leitura propria profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Leitura manager profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_manager());

DROP POLICY IF EXISTS "Leitura propria ou manager permissoes_usuario" ON public.permissoes_usuario;
CREATE POLICY "Leitura propria ou manager permissoes_usuario" ON public.permissoes_usuario FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager());

DROP POLICY IF EXISTS "Leitura propria ou manager supervisor_representantes" ON public.supervisor_representantes;
CREATE POLICY "Leitura propria ou manager supervisor_representantes" ON public.supervisor_representantes FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR public.is_manager());

-- Continua valendo o da v2: nenhuma policy de INSERT/UPDATE/DELETE pro role
-- authenticated nessas tabelas — toda escrita passa pela service role key nas
-- Server Actions guardadas por requireRole/requirePermission.
