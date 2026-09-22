-- ============================================================================
-- Migration v2.7 — Acesso do supervisor passa a vir da equipe
-- Rodar no SQL Editor do Supabase. Idempotente (re-executável).
--
-- Contexto: docs/plano-implementacao-equipes.md (Fase 1). O cliente está
-- difícil de acessar pra validar cada decisão estrutural — decisão desta
-- sessão foi parar de bloquear nisso e fazer o Manager resolver direto no
-- sistema: cada supervisor cadastrado ganha exatamente uma equipe, e o
-- controle de acesso passa a vir dali, em vez do vínculo manual
-- representante-por-representante que existia até aqui.
--
-- Verificado antes de escrever esta migration: supervisor_representantes
-- está com 0 linhas em produção (só existe 1 conta de supervisor de teste,
-- sem nada atribuído) — sem risco de regressão real ao mudar o mecanismo.
-- Mesmo assim, o OR com a tabela antiga foi mantido por segurança (não some
-- nenhum acesso que porventura já exista) — Fase 2 decide se ela é
-- descontinuada de vez depois que a tela /admin/equipes existir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Um supervisor tem no máximo uma equipe (regra de negócio confirmada em
--    22/09/2026 — "cada supervisor terá sua equipe de vendas").
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipes_supervisor_id_key'
  ) THEN
    ALTER TABLE public.equipes ADD CONSTRAINT equipes_supervisor_id_key UNIQUE (supervisor_id);
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. pode_ver_representante() — supervisor passa a enxergar quem está na
--    equipe dele (representantes.equipe_id -> equipes.supervisor_id), além
--    do vínculo manual antigo (OR, ver nota acima). SECURITY DEFINER mantido
--    (mesmo motivo da v2: evitar recursão de RLS ao consultar profiles/
--    equipes/representantes de dentro de uma policy de outra tabela).
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
    RETURN
      EXISTS (
        SELECT 1 FROM public.representantes r
        JOIN public.equipes e ON e.id = r.equipe_id
        WHERE r.id = p_representante_id AND e.supervisor_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.supervisor_representantes sr
        WHERE sr.supervisor_id = auth.uid() AND sr.representante_id = p_representante_id
      );
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.pode_ver_representante(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_ver_representante(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Módulo novo na matriz de permissões — tela /admin/equipes (Fase 2).
--    Mesmo padrão de admin.usuarios/admin.permissoes: aparece na Sidebar via
--    a matriz, mas a página em si é hard-gated a manager (requireRole), não
--    delegável via permissoes_usuario — atribuir supervisor é tão sensível
--    quanto criar login.
-- ----------------------------------------------------------------------------

INSERT INTO public.modulos (slug, label, grupo, rota) VALUES
  ('admin.equipes', 'Equipes', 'Uso Interno', '/admin/equipes')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, grupo = EXCLUDED.grupo, rota = EXCLUDED.rota;

INSERT INTO public.permissoes_role (role, modulo_slug, nivel) VALUES
  ('manager', 'admin.equipes', 'editar')
ON CONFLICT (role, modulo_slug) DO UPDATE SET nivel = EXCLUDED.nivel;
