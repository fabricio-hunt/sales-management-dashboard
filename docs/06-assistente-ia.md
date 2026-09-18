# Assistente IA (`/assistente`)

Chat com o Google Gemini que responde perguntas sobre **uso do sistema e conceitos de negócio** — pensado para
reduzir a dependência de o usuário garimpar o Manual de Uso ou perguntar diretamente ao Manager. Adicionado em
18/09/2026. Escopo restringido a negócio/uso em 18/09/2026 (mesmo dia) — ver "Escopo" abaixo.

## Acesso

Aberto a todo usuário autenticado, no mesmo padrão do Manual de Uso (`/docs`): **fora** do sistema de
permissões por módulo (`modulos`/`permissoes_role`) — não há migration SQL para este módulo, não é revogável por
papel. A única guarda é a sessão (mesmo gate grosso do `proxy.ts` que já protege todo o route group `(app)`).

## Arquivos

- `src/lib/assistente/contexto.ts` — monta a string de documentação injetada no prompt (ver "Fonte de
  conhecimento" abaixo).
- `src/lib/assistente/gemini.ts` — client do `@google/genai`, instrução de sistema, e
  `perguntarAssistenteStream()` (streaming via `chats.create` + `sendMessageStream`). Modelo configurável por
  `GEMINI_MODEL` (default `gemini-3.6-flash` no código — `gemini-2.5-flash` foi descontinuado para novas chaves,
  a API passou a devolver 404 recomendando a troca; confirmado direto contra a API em 18/09/2026).
- `src/app/api/assistente/chat/route.ts` — único endpoint (`POST`, `runtime = "nodejs"`). Exige sessão
  (`getCurrentProfile()`), valida tamanho de mensagem (2000 caracteres) e turnos de histórico (últimos 12),
  devolve a resposta como texto em streaming.
- `src/app/(app)/assistente/page.tsx` + `AssistenteChatClient.tsx` — tela (Server Component + Client Component
  do chat propriamente dito). Histórico só em memória do componente React — sem tabela no Supabase.

## Escopo — só negócio/uso, nada técnico ou de segurança

Decisão explícita de 18/09/2026, depois do módulo já estar em teste: o assistente **não deve responder nada
técnico** (arquitetura, stack, banco de dados, código, deploy) **nem nada de segurança** (autenticação, RLS,
criptografia, "o sistema é seguro?"), mesmo que a pergunta seja inofensiva. Reforçado em duas camadas:

1. **Conteúdo** — `contexto.ts` não inclui mais nenhum resumo técnico (a versão anterior tinha um resumo de
   `01-arquitetura.md`, `02-banco-de-dados.md`, `03-importacao-excel.md` e `04-regras-de-negocio.md`, removido
   nesta mudança) nem a seção "Segurança dos dados" que existia no resumo do Manual de Uso.
2. **Instrução de sistema** (`gemini.ts`) — instrui o modelo a recusar educadamente pergunta técnica/de
   segurança e redirecionar para o time técnico/Manager, mesmo que o modelo "soubesse" responder por
   conhecimento geral (não depende só de faltar contexto).

## Fonte de conhecimento (o que a IA lê)

`contexto.ts` combina três fontes, **sem leitura de arquivo em runtime** — o conteúdo é copiado como constante
de texto TypeScript, porque uma leitura via `fs` em runtime não é garantida no bundle serverless da Vercel (só
inclui o que consegue rastrear estaticamente):

1. Um resumo do Manual de Uso (`docs/page.tsx`), condensado à mão em `contexto.ts` (sem a seção de segurança —
   ver "Escopo" acima).
2. A `AJUDA` de `src/lib/ajuda/conteudo.ts` — essa parte é **importada**, não copiada, então nunca fica
   desatualizada.
3. O glossário de conceitos/métricas (`docs/07-glossario-negocio.md`, espelhado em `GLOSSARIO_NEGOCIO`) — o que
   cada termo significa (curva ABC, positivação, RPA, atingimento...), complementando o Manual/Ajuda, que
   explicam só como usar cada tela. Adicionado depois de uma pergunta real no chat ("o que é a curva ABC de
   produtos?") expor que esse tipo de conceito só tinha uma linha de explicação.

**Trade-off assumido:** os itens 1 e 3 são cópias estáticas. Se o Manual de Uso ou o glossário mudarem de forma
relevante, `contexto.ts` precisa ser atualizado manualmente — não existe pipeline de extração/sync automático
hoje. Não há aviso automático quando isso acontece; é um ponto para revisar sempre que o Manual de Uso mudar.

**Ficam de fora do contexto** (curadoria de segurança original + a restrição de escopo de 18/09/2026):
`PENDENCIAS.md`, `plano-implementacao-seguranca.md`, `pitch-comercial.md`, `roteiro-aceitacao.md`,
`05-componentes-e-layout.md` (desatualizado), e agora também `01-arquitetura.md`, `02-banco-de-dados.md`,
`03-importacao-excel.md` e `04-regras-de-negocio.md` inteiros — não por serem sensíveis, mas por serem técnicos,
fora do escopo decidido para este assistente.

## Variáveis de ambiente

- `GEMINI_API_KEY` (obrigatória, server-only) — chave do Google AI Studio.
- `GEMINI_MODEL` (opcional) — sobrescreve o modelo sem precisar de deploy de código.

## Limitações conhecidas / melhorias futuras

- **`maxOutputTokens` precisa de folga sobre o "thinking budget".** Modelos `gemini-3.x` consomem tokens de
  raciocínio interno do mesmo orçamento de `maxOutputTokens` antes de gerar a resposta visível — um valor baixo
  zera a resposta (sem erro, só sem texto) se o raciocínio consumir todo o orçamento. Testado em 18/09/2026: uma
  pergunta simples já consumiu ~294 tokens só de "thinking". `gemini.ts` usa `2048` como folga.
- **Sem rate limiting persistente.** Mitigado só por limite de tamanho de mensagem/histórico por request. Um
  limitador em memória não seria confiável no ambiente serverless da Vercel (funções stateless); se abuso de
  custo da API virar problema real, a solução passa por uma tabela no Supabase — o que hoje conflitaria com a
  decisão deliberada de não persistir nada deste módulo.
- **Sem RAG/embeddings.** Desnecessário no volume atual de documentação (cabe inteiro no contexto). Primeira
  coisa a revisitar se a documentação crescer muito.
- **Sem histórico persistido** — recarregar a página perde a conversa (decisão deliberada, não limitação técnica).
- **503 "model overloaded" acontece com alguma frequência** no `gemini-3.6-flash`, antes de qualquer chunk ser
  gerado (observado repetidas vezes em 18/09/2026). `gemini.ts` tenta de novo automaticamente até 2 vezes (500ms
  e 1500ms de espera) para 503/429 antes de desistir e devolver o erro genérico ao usuário.
