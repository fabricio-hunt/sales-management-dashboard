# Plano de Implementação — Equipe como unidade central

Criado em 22/09/2026. Contexto: o cliente está difícil de acessar pra validar cada decisão
estrutural (ver `docs/08-refinamento-graficos-equipes-metas.md` e `PENDENCIAS.md` — 3 das 15
perguntas ficaram esperando um terceiro, "Alex Pai", sem resposta). Decisão do usuário nesta
sessão: parar de bloquear em validação externa pra tudo — construir o sistema pra que o **Manager
resolva essas coisas direto na aplicação**, sem depender de confirmação do cliente por WhatsApp.

## Decisões tomadas nesta sessão (substituem as perguntas 7, 8, 9 e 14 do refinamento)

- **Cada supervisor é cadastrado pelo Manager** (`/admin/usuarios`, já existe).
- **Cada supervisor tem exatamente uma equipe** — a mesma divisão já confirmada nas planilhas de
  `equipe-de-vendas/` (92 Campinas, 93 Sorocaba, 94 Jundiaí, 95 EQ. SP, 96 EQ. Sul, 97 EQ. Itape, +
  a 7ª quando o número aparecer). Isso fecha a pergunta 3 (já era 1:1) e formaliza que a equipe é
  a unidade organizacional real, não um adicional.
- **Cada vendedor tem uma meta definida direto pelo Manager** — sem cascata Manager→Supervisor→
  Vendedor, sem o plano de "produto X num dia da semana" do áudio de 21/09 (pergunta 8). Isso já é
  essencialmente o que `/admin/metas` faz hoje (Manager escolhe o representante, define
  `meta_dia_cx` e os demais campos por fornecedor) — decisão simplifica em vez de expandir.
- **Acesso do vendedor (pergunta 14):** sem mudança — continua existindo como já está em produção
  desde a v2 (26/08). O Manager já controla isso na prática ao decidir pra quem entrega a senha.

Isso **não invalida** as perguntas 1 (número da 7ª equipe), 2 (quem é cada supervisor) e 11 (se o
resumo por equipe substitui `/distribuicao`) — só muda o mecanismo: em vez de esperar resposta do
cliente pra eu digitar no banco, o Manager cadastra ele mesmo, quando tiver o dado, direto na tela
nova de equipes (Fase 2 abaixo).

## Fase 1 — Fundação: acesso por equipe (feito nesta sessão)

O maior gap técnico encontrado: **o controle de acesso do supervisor hoje não usa `equipes`
nenhuma.** `pode_ver_representante()` (a função que decide o que cada supervisor enxerga em
`vendas`/`clientes`/`metas`) consulta `supervisor_representantes`, uma tabela de atribuição manual
representante-por-representante, sem relação com a equipe nova. Pra "tudo girar em torno da
equipe" isso precisa mudar na fundação, antes de qualquer tela nova.

- [x] `equipes.supervisor_id` ganha `UNIQUE` — impõe 1 supervisor : 1 equipe no banco, não só por
      convenção.
- [x] `pode_ver_representante()` reescrita: supervisor enxerga um representante se ele estiver na
      equipe daquele supervisor (`representantes.equipe_id` → `equipes.supervisor_id = auth.uid()`)
      **OU** (mantido por segurança, sem quebrar nada que já exista) estiver na tabela antiga
      `supervisor_representantes`. Confirmado que a tabela antiga está vazia em produção (0 linhas,
      só 1 conta de supervisor de teste sem nada atribuído) — sem risco de regressão real.
- [x] `representantesEscopo()` (`src/lib/auth/session.ts`, contraparte de app-layer da RLS, usada
      pra montar os dropdowns/filtros de tela) atualizada com a mesma lógica — senão a RLS libera o
      dado mas a tela continua mostrando os pickers vazios.
- [x] `supabase_migration_v2_7.sql` — rodar em produção.

## Fase 2 — Tela `/admin/equipes` (feito em 22/09/2026)

Antes só dava pra criar equipe/atribuir supervisor rodando script no banco
(`scripts/seed_equipes_v1.mjs`). Agora é tela — Manager resolve sozinho, sem depender de mim nem
do cliente:
- [x] Listar as equipes (número, cor, supervisor atual, quantos representantes) —
      `src/app/(app)/admin/equipes/`.
- [x] Criar equipe nova (a 7ª, quando o número aparecer) — cor atribuída automaticamente pela
      próxima cor livre da `chartPalette`, sem input manual.
- [x] Atribuir/trocar o supervisor de uma equipe (dropdown de usuários `role=supervisor`,
      desabilita quem já está em outra equipe — a UNIQUE da v2.7 é quem garante de fato).
- [x] Reatribuir a equipe de um representante (resolve a pendência dos representantes 213/313 sem
      precisar de mim nem do cliente).
- [x] Módulo `admin.equipes` na matriz de permissões (manager-only, mesmo padrão de
      admin.usuarios/admin.permissoes — não delegável), link na Sidebar, ajuda contextual.
- [ ] **Ainda não feito:** revisar `UsuariosClient.tsx`/`admin/usuarios` — o seletor manual
      "atribuir representantes ao supervisor" (que escreve em `supervisor_representantes`) ficou
      redundante agora que a equipe resolve isso. `pode_ver_representante()` mantém o OR com a
      tabela antiga por segurança (v2.7), então nada quebra deixando como está — mas o texto de
      ajuda de `admin.usuarios` já foi atualizado pra apontar pra Equipes como o caminho principal.
      Decidir depois se remove esse seletor antigo ou deixa como exceção manual.

## Fase 3 — Ajustes de usabilidade nas telas que já existem

- [ ] Agrupar o seletor de representante em `/admin/metas` (e outras telas com um `<select>` de 41
      representantes) por equipe — hoje é uma lista plana, ficou grande depois do import das 5
      equipes.

## Fase 4 — Resumo da Distribuição por equipe

- [ ] Novo componente/tela: Base Ativa, Cadastro, Meta e Realizado por equipe, gráfico de barra
      colorido pela cor fixa de cada equipe (pergunta 10 já resolvida — são dois números
      diferentes; falta só o período exato de "ativo", ver `PENDENCIAS.md`).
- [ ] Decidir (documentando a decisão, sem precisar do cliente) se substitui `/distribuicao` ou
      convive com ela.

## Fase 5 — Analítico de Vendas por equipe

- [ ] Trocar os pills de filtro por representante por pills de equipe, com drill-down por
      representante dentro da equipe (pergunta 15 já resolvida: sim, precisa do drill-down).

## Segue fora de escopo, sem mudança

- Metas em cascata Manager→Supervisor→Vendedor com plano por produto/dia — decisão desta sessão
  descartou essa ideia (ver acima). Se o cliente confirmar depois que era isso mesmo que queria,
  reabre como funcionalidade nova.
- Número da 7ª equipe, supervisores reais, representantes 213/313 — não bloqueiam mais nada de
  código; viram cadastro que o Manager faz sozinho na Fase 2.
