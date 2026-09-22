-- ============================================================================
-- Migration v2.6 — Entidade `equipes`
-- Rodar no SQL Editor do Supabase. Idempotente (re-executável).
--
-- Contexto: docs/08-refinamento-graficos-equipes-metas.md (seção 2.4) e
-- docs/PENDENCIAS.md (atualização 22/09/2026). Cliente pediu organização por
-- equipe numerada (não nome, por causa de rotatividade), cor própria por
-- equipe nos gráficos. Respostas do cliente em 22/09 que este schema reflete:
--   - pergunta 3: representante pertence a uma ÚNICA equipe (1:1).
--   - pergunta 4: número da equipe é fixo, mesmo com troca de
--     supervisor/vendedores.
--   - pergunta 5 + 13: cor é atribuída pelo SISTEMA (não editável em tela) e
--     fica FIXA em todos os gráficos depois de atribuída.
--   - pergunta 6: histórico de vendas/metas deve contar por equipe também.
--     Como `equipe_id` fica em `representantes` (dimensão), não em `vendas`
--     (fato), isso já é automático: qualquer consulta que faça
--     vendas -> representantes -> equipes enxerga o histórico inteiro sob a
--     equipe atual do representante, sem precisar de backfill. Mesma
--     convenção já usada para fornecedor_id em produtos.
--
-- NÃO populado ainda: ainda faltam os 7 números de equipe e os supervisores
-- de cada uma (perguntas de acompanhamento em 08-refinamento-...md, seção
-- 4.1). Sem a tela de administração (`/admin/equipes`, a construir junto com
-- a atribuição de cor pela app) não há como um número de equipe ser criado
-- ainda — este migration só prepara o schema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela `equipes`
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.equipes (
  id TEXT PRIMARY KEY, -- número da equipe vindo do ERP, ex: "94" (mesmo padrão de representantes.id)
  cor TEXT NOT NULL, -- hex, atribuída pela app na criação (chartPalette de src/lib/design-tokens.ts, na ordem de cadastro) — não editável em tela, fica fixa depois
  supervisor_id UUID REFERENCES public.profiles(id), -- nullable até sabermos quem é o supervisor de cada equipe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.equipes IS
  'Equipe numerada (ex: 92, 94), cor fixa atribuída pelo sistema, supervisor vinculado. Ver docs/08-refinamento-graficos-equipes-metas.md secao 2.4.';
COMMENT ON COLUMN public.equipes.cor IS
  'Atribuida pela app na criacao (indice de insercao mod tamanho da chartPalette em design-tokens.ts). Nao editavel pelo usuario (pergunta 5/13 do refinamento).';

-- Vínculo representante -> equipe. FK simples no lado "muitos" já garante 1:1
-- (um representante não pode referenciar mais de uma equipe ao mesmo tempo,
-- pergunta 3). Nullable até a atribuição real existir.
ALTER TABLE public.representantes
  ADD COLUMN IF NOT EXISTS equipe_id TEXT REFERENCES public.equipes(id);

COMMENT ON COLUMN public.representantes.equipe_id IS
  'Equipe atual do representante. Historico de vendas/metas conta pela equipe ATUAL (join ao vivo, sem snapshot) — pergunta 6 do refinamento.';

-- ----------------------------------------------------------------------------
-- 2. RLS — mesma regra das demais dimensões (representantes/produtos/
--    fornecedores): qualquer usuário logado lê, ninguém deslogado. Escrita
--    não tem policy nenhuma de propósito (nega por padrão), só
--    supabaseAdmin em Server Action grava — mesmo padrão do resto do banco.
-- ----------------------------------------------------------------------------

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura autenticada equipes" ON public.equipes;
CREATE POLICY "Leitura autenticada equipes" ON public.equipes
  FOR SELECT TO authenticated USING (true);
