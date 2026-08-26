-- ============================================================================
-- Migration v2 — Login, RBAC, override de positivação, comissionamento,
-- Top 20 Clientes / Top 10 Vendedores.
-- Rode isso no SQL Editor do Supabase DEPOIS de supabase_schema.sql,
-- supabase_migration_v1.sql e supabase_migration_v1_1.sql já terem rodado.
-- Ver docs/PENDENCIAS.md e o plano de v2 pro contexto de cada decisão.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Papéis e tabela de perfis (liga auth.users ao papel/representante)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('manager', 'supervisor', 'vendedor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nivel_permissao AS ENUM ('nenhum', 'visualizar', 'editar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role public.user_role NOT NULL,
  representante_id TEXT REFERENCES public.representantes(id), -- obrigatório p/ vendedor, null nos demais
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Supervisor -> representantes atribuídos pelo Manager (relação real de acesso;
-- representantes.supervisor continua sendo só o texto livre vindo do ERP).
CREATE TABLE IF NOT EXISTS public.supervisor_representantes (
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  representante_id TEXT NOT NULL REFERENCES public.representantes(id) ON DELETE CASCADE,
  PRIMARY KEY (supervisor_id, representante_id)
);

-- ----------------------------------------------------------------------------
-- 2. Lista canônica de módulos + matriz de permissões (role e por usuário)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.modulos (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  grupo TEXT NOT NULL,
  rota TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissoes_role (
  role public.user_role NOT NULL,
  modulo_slug TEXT NOT NULL REFERENCES public.modulos(slug) ON DELETE CASCADE,
  nivel public.nivel_permissao NOT NULL DEFAULT 'nenhum',
  PRIMARY KEY (role, modulo_slug)
);

-- Linha ausente = herda o default de permissoes_role; linha presente = override
-- por usuário (mesma convenção de override nullable já usada em metas_representante).
CREATE TABLE IF NOT EXISTS public.permissoes_usuario (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modulo_slug TEXT NOT NULL REFERENCES public.modulos(slug) ON DELETE CASCADE,
  nivel public.nivel_permissao NOT NULL,
  PRIMARY KEY (user_id, modulo_slug)
);

INSERT INTO public.modulos (slug, label, grupo, rota) VALUES
  ('dashboard',               'Resumo Geral',              'Dashboard',                  '/'),
  ('equipe',                  'Visão Equipe (RPA)',        'Dashboard',                  '/equipe'),
  ('comissoes',               'Comissão/Premiação',        'Dashboard',                  '/comissoes'),
  ('analitico.vendas',        'Analítico de Vendas',       'Dados Analíticos',           '/analitico/vendas'),
  ('analitico.cliente',       'Analítico Cliente',         'Dados Analíticos',           '/analitico/cliente'),
  ('analitico.faturamento_dia','Faturamento Diário',       'Dados Analíticos',           '/analitico/faturamento-dia'),
  ('analitico.devolucoes',    'Devoluções',                'Dados Analíticos',           '/analitico/devolucoes'),
  ('produtos',                'Curva ABC de Produtos',     'Dados Analíticos',           '/produtos'),
  ('rankings.positivacao',    'Ranking Positivação',       'Rankings',                   '/rankings/positivacao'),
  ('rankings.financeiro',     'Ranking Financeiro',        'Rankings',                   '/rankings/financeiro'),
  ('rankings.clientes',       'Top 20 Clientes',           'Rankings',                   '/rankings/clientes'),
  ('rankings.vendedores',     'Top 10 Vendedores',         'Rankings',                   '/rankings/vendedores'),
  ('distribuicao',            'Resumo Distribuição',       'Distribuição & Evolução',    '/distribuicao'),
  ('evolucao',                'Evolução por Cliente',      'Distribuição & Evolução',    '/evolucao'),
  ('admin.importar',          'Importar Base',             'Uso Interno',                '/admin/importar'),
  ('admin.metas',             'Metas por Fornecedor',      'Uso Interno',                '/admin/metas'),
  ('admin.comissoes',         'Faixas de Comissão',        'Uso Interno',                '/admin/comissoes'),
  ('admin.fornecedores',      'Fornecedores',              'Uso Interno',                '/admin/fornecedores'),
  ('admin.vendas',            'Lançar Venda',              'Uso Interno',                '/admin/vendas'),
  ('admin.clientes',          'Gestão Clientes',           'Uso Interno',                '/admin/clientes'),
  ('admin.representantes',    'Gestão Equipe',             'Uso Interno',                '/admin/representantes'),
  ('admin.usuarios',          'Usuários',                  'Uso Interno',                '/admin/usuarios'),
  ('admin.permissoes',        'Permissões',                'Uso Interno',                '/admin/permissoes'),
  ('configuracoes',           'Configurações',             'Uso Interno',                '/configuracoes')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, grupo = EXCLUDED.grupo, rota = EXCLUDED.rota;

-- Manager: editar em tudo (documentativo — a aplicação já libera manager sem
-- consultar essa tabela, ver src/lib/auth/permissions.ts).
INSERT INTO public.permissoes_role (role, modulo_slug, nivel)
SELECT 'manager', slug, 'editar' FROM public.modulos
ON CONFLICT (role, modulo_slug) DO NOTHING;

-- Vendedor: só o que é sobre o próprio desempenho.
INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('vendedor', 'dashboard', 'visualizar'),
  ('vendedor', 'equipe', 'visualizar'),
  ('vendedor', 'comissoes', 'visualizar')
ON CONFLICT (role, modulo_slug) DO NOTHING;

-- Supervisor: default conservador de visualização nas telas de dados/rankings,
-- nada em admin.* — o Manager amplia depois em /admin/permissoes conforme a
-- necessidade validada com o cliente (ver docs/PENDENCIAS.md item 2).
INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('supervisor', 'dashboard', 'visualizar'),
  ('supervisor', 'equipe', 'visualizar'),
  ('supervisor', 'comissoes', 'visualizar'),
  ('supervisor', 'analitico.vendas', 'visualizar'),
  ('supervisor', 'analitico.cliente', 'visualizar'),
  ('supervisor', 'analitico.faturamento_dia', 'visualizar'),
  ('supervisor', 'analitico.devolucoes', 'visualizar'),
  ('supervisor', 'produtos', 'visualizar'),
  ('supervisor', 'rankings.positivacao', 'visualizar'),
  ('supervisor', 'rankings.financeiro', 'visualizar'),
  ('supervisor', 'rankings.clientes', 'visualizar'),
  ('supervisor', 'rankings.vendedores', 'visualizar'),
  ('supervisor', 'distribuicao', 'visualizar'),
  ('supervisor', 'evolucao', 'visualizar')
ON CONFLICT (role, modulo_slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Função de apoio à RLS — resolve se o usuário logado pode ver um
--    representante (manager: todos; vendedor: só o próprio; supervisor: só os
--    atribuídos em supervisor_representantes). SECURITY DEFINER pra evitar
--    recursão de RLS ao consultar profiles/supervisor_representantes de dentro
--    de uma policy de outra tabela.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pode_ver_representante(p_representante_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role public.user_role;
  v_rep_id TEXT;
BEGIN
  SELECT role, representante_id INTO v_role, v_rep_id FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role = 'manager' THEN RETURN true; END IF;
  IF v_role = 'vendedor' THEN RETURN v_rep_id IS NOT NULL AND v_rep_id = p_representante_id; END IF;
  IF v_role = 'supervisor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.supervisor_representantes sr
      WHERE sr.supervisor_id = auth.uid() AND sr.representante_id = p_representante_id
    );
  END IF;
  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RLS — profiles / supervisor_representantes / modulos / permissoes_*
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura propria ou manager profiles" ON public.profiles;
DROP POLICY IF EXISTS "Leitura publica modulos" ON public.modulos;
DROP POLICY IF EXISTS "Leitura publica permissoes_role" ON public.permissoes_role;
DROP POLICY IF EXISTS "Leitura propria ou manager permissoes_usuario" ON public.permissoes_usuario;
DROP POLICY IF EXISTS "Leitura propria ou manager supervisor_representantes" ON public.supervisor_representantes;

-- profiles: cada um lê o próprio; manager lê todos (checa via subquery na
-- própria tabela, seguro aqui pois não há recursão — é a mesma linha do usuário).
CREATE POLICY "Leitura propria ou manager profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'manager'));

CREATE POLICY "Leitura publica modulos" ON public.modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura publica permissoes_role" ON public.permissoes_role FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leitura propria ou manager permissoes_usuario" ON public.permissoes_usuario FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'manager'));

CREATE POLICY "Leitura propria ou manager supervisor_representantes" ON public.supervisor_representantes FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'manager'));

-- Nenhuma policy de INSERT/UPDATE/DELETE pro role authenticated em nenhuma
-- dessas tabelas: toda escrita (criar usuário, mudar permissão, atribuir
-- representante a supervisor) passa pela service role key via Server Actions
-- guardadas por requirePermission (ver src/app/(app)/admin/actions.ts e
-- src/app/(app)/admin/usuarios|permissoes/actions.ts).

-- ----------------------------------------------------------------------------
-- 5. RLS reforçada em vendas/clientes — fecha a leitura pública que a v1
--    mantinha (login agora é obrigatório pra tudo, ver src/middleware.ts) e
--    escopa por representante conforme o papel do usuário logado.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Leitura publica vendas" ON public.vendas;
DROP POLICY IF EXISTS "Leitura publica clientes" ON public.clientes;

CREATE POLICY "Leitura escopada vendas" ON public.vendas FOR SELECT TO authenticated
  USING (public.pode_ver_representante(representante_id));

-- clientes sem representante_id (carteira não atribuída) só aparece pro
-- manager — pode_ver_representante(NULL) resolve false pra vendedor/supervisor.
CREATE POLICY "Leitura escopada clientes" ON public.clientes FOR SELECT TO authenticated
  USING (public.pode_ver_representante(representante_id));

-- representantes/fornecedores/produtos/periodos/metas/metas_representante/
-- fornecedor_aliases/import_log permanecem com leitura pública (ver
-- supabase_migration_v1.sql/v1_1.sql) — não carregam dado sensível por
-- representante, e ficarem abertos evita duplicar a mesma lógica de escopo
-- em cada tabela de configuração.

-- ----------------------------------------------------------------------------
-- 6. security_invoker nas views — sem isso, RLS em vendas/clientes seria
--    avaliada com o dono da view (não quem está consultando), o que
--    silenciosamente ignoraria o escopo acima pra qualquer um que use as views.
-- ----------------------------------------------------------------------------

ALTER VIEW public.vw_realizado_rep_fornecedor SET (security_invoker = true);
ALTER VIEW public.vw_realizado_equipe_fornecedor SET (security_invoker = true);
ALTER VIEW public.vw_faturamento_diario SET (security_invoker = true);
ALTER VIEW public.vw_positivacao_representante SET (security_invoker = true);
ALTER VIEW public.vw_financeiro_representante SET (security_invoker = true);
ALTER VIEW public.vw_vendas_cliente_dia SET (security_invoker = true);

-- ----------------------------------------------------------------------------
-- 7. Override do número de positivação (485) — mesma convenção de
--    cadastro_total_override/base_ativa_override: NULL = cálculo ao vivo
--    (COUNT DISTINCT cliente_id WHERE is_positivacao=1), valor setado =
--    referência confirmada pelo Manager. Ver docs/PENDENCIAS.md item 1.
-- ----------------------------------------------------------------------------

ALTER TABLE public.metas_representante
  ADD COLUMN IF NOT EXISTS positivacao_realizado_override INT;

-- ----------------------------------------------------------------------------
-- 8. Comissionamento dinâmico — faixas de atingimento configuráveis pelo
--    Manager, consumindo metas.premiacao_pct_cx/premiacao_pct_fin (já
--    existiam desde a v1, nunca foram usadas em nenhum cálculo até agora).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comissao_faixas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'Padrão',
  fornecedor_id INT REFERENCES public.fornecedores(id), -- NULL = aplica a todos sem regra específica
  ordem INT NOT NULL,
  pct_atingimento_min NUMERIC(7,2) NOT NULL,
  pct_atingimento_max NUMERIC(7,2), -- NULL = sem teto (faixa "acima de 100%")
  modo TEXT NOT NULL CHECK (modo IN ('proporcional', 'fator_fixo')),
  fator NUMERIC(7,4) NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.comissao_faixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura publica comissao_faixas" ON public.comissao_faixas;
CREATE POLICY "Leitura publica comissao_faixas" ON public.comissao_faixas FOR SELECT TO authenticated USING (true);

-- Seed inicial espelhando as regras textuais já vistas na planilha original
-- ("Proporcional 90%" / "Acima de 100%", docs/PENDENCIAS.md item 2). Os
-- percentuais/fatores exatos são placeholder — ainda precisam de confirmação
-- do cliente, mas ficam editáveis em /admin/comissoes desde o primeiro deploy.
INSERT INTO public.comissao_faixas (nome, fornecedor_id, ordem, pct_atingimento_min, pct_atingimento_max, modo, fator)
SELECT 'Abaixo de 90%', NULL, 1, 0, 90, 'proporcional', 1.0
WHERE NOT EXISTS (SELECT 1 FROM public.comissao_faixas);

INSERT INTO public.comissao_faixas (nome, fornecedor_id, ordem, pct_atingimento_min, pct_atingimento_max, modo, fator)
SELECT '90% a 100%', NULL, 2, 90, 100, 'fator_fixo', 1.0
WHERE NOT EXISTS (SELECT 1 FROM public.comissao_faixas WHERE ordem = 2);

INSERT INTO public.comissao_faixas (nome, fornecedor_id, ordem, pct_atingimento_min, pct_atingimento_max, modo, fator)
SELECT 'Acima de 100%', NULL, 3, 100, NULL, 'fator_fixo', 1.1
WHERE NOT EXISTS (SELECT 1 FROM public.comissao_faixas WHERE ordem = 3);

-- ----------------------------------------------------------------------------
-- 9. Top 20 Clientes — não existia nenhuma view por cliente até agora.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_top_clientes_mes
WITH (security_invoker = true) AS
SELECT
  date_trunc('month', v.data_venda)::date AS mes,
  v.cliente_id,
  c.razao_social,
  c.fantasia,
  c.representante_id,
  SUM(v.venda_liq) AS venda_liq,
  SUM(v.qtde) AS qtde,
  COUNT(DISTINCT v.data_venda) AS dias_com_compra
FROM public.vendas v
JOIN public.clientes c ON c.id = v.cliente_id
GROUP BY 1, 2, 3, 4, 5;

-- ----------------------------------------------------------------------------
-- 10. import_log — amplia o CHECK de tipo pra um futuro 5º pipeline
--     (metas_representante), mesma tabela de auditoria da v1.1.
-- ----------------------------------------------------------------------------

ALTER TABLE public.import_log DROP CONSTRAINT IF EXISTS import_log_tipo_check;
ALTER TABLE public.import_log ADD CONSTRAINT import_log_tipo_check
  CHECK (tipo IN ('vendas', 'fornecedores', 'clientes', 'metas', 'metas_representante'));
