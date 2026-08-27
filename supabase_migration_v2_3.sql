-- ============================================================================
-- Migration v2.3 — Senha provisória / troca obrigatória no primeiro acesso
-- Rode DEPOIS de supabase_migration_v2_2.sql.
--
-- Contexto: o manager cria o usuário em /admin/usuarios digitando uma senha
-- inicial (não existe SMTP configurado no projeto, então não há como mandar
-- convite nem "esqueci minha senha" por e-mail). Essa senha não pode virar a
-- senha permanente da pessoa — quem criou a conta a conhece.
--
-- Enquanto senha_provisoria = true, src/app/(app)/layout.tsx manda o usuário
-- pra /trocar-senha e ele não navega pro resto da app. A própria troca
-- (supabase.auth.updateUser) zera a flag.
--
-- DEFAULT false de propósito: as contas que já existem (o manager criado pelo
-- scripts/seed_first_manager.mjs) escolheram a própria senha e não devem ser
-- forçadas a trocar. Só quem for criado a partir de agora nasce com true, via
-- createUsuario() em src/app/(app)/admin/usuarios/actions.ts.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.senha_provisoria IS
  'true = senha definida pelo manager na criação; força troca no primeiro acesso antes de liberar a app.';

-- Sem policy nova: profiles continua sem UPDATE pro role authenticated (v2).
-- A escrita da flag é feita pela service role key dentro de Server Actions
-- escopadas ao próprio auth.uid() — ver src/app/(app)/conta/actions.ts.
