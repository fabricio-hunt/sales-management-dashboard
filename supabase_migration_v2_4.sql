-- ============================================================================
-- Migration v2.4 — Fecha leitura anônima, regime CLT/PJ, ajustes de matriz
-- Rodar no SQL Editor do Supabase. Idempotente (re-executável).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ACHADO DE SEGURANÇA — leitura sem login
--
--    As policies da v1 foram criadas como `FOR SELECT USING (true)` SEM cláusula
--    `TO`. Sem `TO`, a policy vale pra PUBLIC, o que inclui o role `anon` — ou
--    seja, valem pra quem só tem a publishable key, e essa key vai no bundle do
--    browser (NEXT_PUBLIC_SUPABASE_ANON_KEY). Verificado contra o PostgREST de
--    produção em 27/08/2026, sem nenhum token de sessão:
--
--      representantes       206  7 linhas
--      produtos             206  253 linhas
--      fornecedores         206  28 linhas
--      periodos             206  1 linha
--      metas                206  175 linhas   <-- % de premiação por rep x fornecedor
--      metas_representante  206  7 linhas     <-- objetivo de positivação e taxas-base
--      import_log           206  2 linhas
--
--    `vendas`, `clientes`, `profiles` e as tabelas da v2 já devolviam 0 linhas
--    porque foram criadas com `TO authenticated` — o problema é só o legado v1.
--    `metas`/`metas_representante` são o pior caso: é dado de remuneração da
--    equipe exposto sem autenticação nenhuma.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Leitura publica representantes" ON public.representantes;
DROP POLICY IF EXISTS "Leitura publica produtos"       ON public.produtos;
DROP POLICY IF EXISTS "Leitura publica fornecedores"   ON public.fornecedores;
DROP POLICY IF EXISTS "Leitura publica aliases"        ON public.fornecedor_aliases;
DROP POLICY IF EXISTS "Leitura publica periodos"       ON public.periodos;
DROP POLICY IF EXISTS "Leitura publica metas"          ON public.metas;
DROP POLICY IF EXISTS "Leitura publica metas_rep"      ON public.metas_representante;
DROP POLICY IF EXISTS "Leitura publica import_log"     ON public.import_log;

-- Dimensões: qualquer usuário logado pode ler (a app precisa delas em selects,
-- filtros e rótulos), mas ninguém deslogado.
CREATE POLICY "Leitura autenticada representantes" ON public.representantes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura autenticada produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura autenticada fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura autenticada aliases" ON public.fornecedor_aliases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura autenticada periodos" ON public.periodos
  FOR SELECT TO authenticated USING (true);

-- import_log: exigir login basta. Restringir a is_manager() criaria uma quebra
-- silenciosa — /admin/importar já é gateada por requirePageAccess("admin.importar"),
-- e o Manager pode delegar esse módulo a um supervisor pela matriz; nesse caso o
-- histórico sumiria da tela sem erro nenhum.
CREATE POLICY "Leitura autenticada import_log" ON public.import_log
  FOR SELECT TO authenticated USING (true);

-- Metas carregam o % de premiação de cada pessoa. Além de exigir login, passam
-- pelo MESMO escopo de vendas/clientes: vendedor só vê a própria meta, supervisor
-- só a dos representantes atribuídos, manager vê tudo. pode_ver_representante()
-- é SECURITY DEFINER, então não recria a recursão que quebrou o login na v2.
CREATE POLICY "Leitura escopada metas" ON public.metas
  FOR SELECT TO authenticated USING (public.pode_ver_representante(representante_id));
CREATE POLICY "Leitura escopada metas_representante" ON public.metas_representante
  FOR SELECT TO authenticated USING (public.pode_ver_representante(representante_id));

-- ----------------------------------------------------------------------------
-- 2. Regime de contratação — CLT ou PJ
--
--    Resposta do cliente em 27/08: "A comissão é calculada por 1 - CLT ou PJ,
--    temos 2 formatos diferenciados". Ele descreveu a ESTRUTURA, não os
--    percentuais — então aqui entra só o campo. O cálculo diferenciado por
--    regime NÃO foi implementado: falta o cliente informar o que muda entre os
--    dois. Nullable de propósito: os 7 representantes existentes ficam como
--    "não informado" em vez de receberem um regime chutado.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'regime_contratacao') THEN
    CREATE TYPE public.regime_contratacao AS ENUM ('clt', 'pj');
  END IF;
END
$$;

ALTER TABLE public.representantes
  ADD COLUMN IF NOT EXISTS regime public.regime_contratacao;

COMMENT ON COLUMN public.representantes.regime IS
  'CLT ou PJ. Cliente confirmou que existem 2 formatos de comissão diferentes; os percentuais de cada um ainda não foram informados (ver docs/PENDENCIAS.md item 7).';

-- ----------------------------------------------------------------------------
-- 3. Matriz de permissões — as duas inconsistências levantadas em 27/08
-- ----------------------------------------------------------------------------

-- (a) admin.vendas estava no grupo "Uso Interno" na tabela modulos, enquanto a
--     Sidebar sempre o mostrou sob "Dashboard". Como o vendedor tem acesso a
--     ele, o rótulo "Uso Interno" na tela de permissões sugeria área
--     administrativa. Alinhado com a Sidebar.
UPDATE public.modulos SET grupo = 'Dashboard' WHERE slug = 'admin.vendas';

-- (b) A tela de lançamento foi construída prevendo "Manager/Supervisor podem
--     escolher o representante", mas a matriz dava 'nenhum' ao supervisor. Como
--     a venda real vem do Palmtop (confirmado pelo cliente em 27/08), o
--     lançamento manual é caminho de correção/exceção — e é justamente o
--     supervisor quem corrige. O escopo dele continua limitado por RLS aos
--     representantes atribuídos.
INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('supervisor', 'admin.vendas', 'editar')
ON CONFLICT (role, modulo_slug) DO UPDATE SET nivel = EXCLUDED.nivel;
