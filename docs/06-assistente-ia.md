# Assistente IA (`/assistente`)

Chat com o Google Gemini que responde perguntas sobre o sistema com base na documentação — pensado para reduzir
a dependência de o usuário garimpar o Manual de Uso ou perguntar diretamente ao Manager. Adicionado em 18/09/2026.

## Acesso

Aberto a todo usuário autenticado, no mesmo padrão do Manual de Uso (`/docs`): **fora** do sistema de
permissões por módulo (`modulos`/`permissoes_role`) — não há migration SQL para este módulo, não é revogável por
papel. A única guarda é a sessão (mesmo gate grosso do `proxy.ts` que já protege todo o route group `(app)`).

## Arquivos

- `src/lib/assistente/contexto.ts` — monta a string de documentação injetada no prompt (ver "Fonte de
  conhecimento" abaixo).
- `src/lib/assistente/gemini.ts` — client do `@google/genai`, instrução de sistema, e
  `perguntarAssistenteStream()` (streaming via `chats.create` + `sendMessageStream`). Modelo configurável por
  `GEMINI_MODEL` (default `gemini-2.5-flash` no código).
- `src/app/api/assistente/chat/route.ts` — único endpoint (`POST`, `runtime = "nodejs"`). Exige sessão
  (`getCurrentProfile()`), valida tamanho de mensagem (2000 caracteres) e turnos de histórico (últimos 12),
  devolve a resposta como texto em streaming.
- `src/app/(app)/assistente/page.tsx` + `AssistenteChatClient.tsx` — tela (Server Component + Client Component
  do chat propriamente dito). Histórico só em memória do componente React — sem tabela no Supabase.

## Fonte de conhecimento (o que a IA lê)

`contexto.ts` combina três fontes, **sem leitura de arquivo em runtime** — o conteúdo é copiado como constante de
texto TypeScript, porque uma leitura via `fs` em runtime não é garantida no bundle serverless da Vercel (só inclui
o que consegue rastrear estaticamente):

1. Um resumo do Manual de Uso (`docs/page.tsx`), condensado à mão em `contexto.ts`.
2. A `AJUDA` de `src/lib/ajuda/conteudo.ts` — essa parte é **importada**, não copiada, então nunca fica
   desatualizada.
3. Um resumo de `01-arquitetura.md`, `02-banco-de-dados.md` (só a parte de estrutura/tabelas — ver exclusão
   abaixo), `03-importacao-excel.md` e `04-regras-de-negocio.md`.

**Trade-off assumido:** os itens 1 e 3 são cópias estáticas. Se o Manual de Uso ou esses `.md` mudarem de forma
relevante, `contexto.ts` precisa ser atualizado manualmente — não existe pipeline de extração/sync automático
hoje. Não há aviso automático quando isso acontece; é um ponto para revisar sempre que o Manual de Uso mudar.

**Curadoria deliberada de segurança — ficam de fora do contexto:**
- `PENDENCIAS.md`, `plano-implementacao-seguranca.md`, `pitch-comercial.md` — conteúdo interno (bugs conhecidos,
  postura de segurança, material comercial), impróprio para expor a todo usuário logado (inclusive vendedor) via
  uma API externa.
- As seções "Segurança (RLS)" e "Criptografia" de `02-banco-de-dados.md` — mesmo motivo: detalham a postura de
  segurança do sistema.
- `05-componentes-e-layout.md` — fora por estar desatualizado e duplicar, pior, o que o Manual de Uso já cobre.

A instrução de sistema em `gemini.ts` também orienta o modelo a priorizar o Manual de Uso/Ajuda contextual sobre
a documentação técnica quando os dois divergirem (a documentação técnica tende a ficar desatualizada mais rápido
— ex.: `04-regras-de-negocio.md` ainda descreve a comissão como "em aberto", mas o Manual já reflete o cálculo
funcionando via Faixas de Comissão) — e a admitir quando não sabe algo, em vez de inventar.

## Variáveis de ambiente

- `GEMINI_API_KEY` (obrigatória, server-only) — chave do Google AI Studio.
- `GEMINI_MODEL` (opcional) — sobrescreve o modelo sem precisar de deploy de código.

## Limitações conhecidas / melhorias futuras

- **Sem rate limiting persistente.** Mitigado só por limite de tamanho de mensagem/histórico por request. Um
  limitador em memória não seria confiável no ambiente serverless da Vercel (funções stateless); se abuso de
  custo da API virar problema real, a solução passa por uma tabela no Supabase — o que hoje conflitaria com a
  decisão deliberada de não persistir nada deste módulo.
- **Sem RAG/embeddings.** Desnecessário no volume atual de documentação (cabe inteiro no contexto). Primeira
  coisa a revisitar se a documentação crescer muito.
- **Sem histórico persistido** — recarregar a página perde a conversa (decisão deliberada, não limitação técnica).
