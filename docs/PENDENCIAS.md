# Pendências & Dúvidas — Sessão 24/08/2026

Documento criado para registrar todos os pontos abertos antes de continuar o desenvolvimento.

> **Atualização 30/08/2026 — varredura de segurança executada (fecha item 7 de 27/08):**
>
> Executado o plano de `docs/plano-implementacao-seguranca.md` (escrito em 29/08). Resultado item a item:
>
> **Etapa 1 (checklist painel Supabase):**
> - MFA na conta do dono do projeto: **não habilitado** ("No authenticator apps yet") — exige ação manual do
>   dono (app autenticador no celular), não automatizável. Ainda pendente.
> - Backup diário/PITR: **indisponível** — "Free Plan does not include project backups". Não há nenhum backup
>   automático rodando hoje. Decisão de upgrade pro plano Pro fica em aberto, é decisão de billing do cliente.
> - Network Restrictions: página não localizada nessa versão do painel/plano — item já era baixa prioridade
>   (ninguém usa conexão direta ao Postgres, só PostgREST via `supabase-js`).
> - Comprimento mínimo de senha: **corrigido de 6 para 8**, salvo no painel (Authentication > Sign In/Providers
>   > Email) e confirmado persistido.
> - Leaked password protection (HaveIBeenPwned): bloqueado, só disponível no plano Pro.
> - Rate limit de login: default do Supabase (360 req/5min sign-in/sign-up, 1800/h token refresh) — não
>   customizado nem desabilitado. OK.
> - Rotação de refresh token: **habilitada** ("Detect and revoke potentially compromised refresh tokens" = ON,
>   reuse interval 10s). OK.
> - anon key vs service_role key: já confirmado — `.env.local`/Vercel usam só `anon`, `service_role` real só no
>   server (Vercel env). OK.
> - **Achado extra (fora do checklist original):** "Allow new users to sign up" estava ativo no projeto — a API
>   `/auth/v1/signup` aceitava auto-cadastro público usando só a `anon key`, embora o app nunca chame
>   `supabase.auth.signUp()` (só `admin.createUser`, restrito a manager). Testado: como "Confirm email" está
>   ativo, o cadastro não gerava sessão sem confirmar e-mail, então não vazava dado — mas era superfície sem uso
>   legítimo. **Desativado** e confirmado via `/auth/v1/settings` (`disable_signup: true`).
>
> **Etapa 2a — `scripts/security_audit_rls_anon.mjs` (novo script):** rodou contra produção, **16/16 tabelas OK**
> — nenhuma linha legível sem sessão, incluindo as 8 do achado de 27/08. Reconfirma que a v2.4 segue aplicada.
>
> **Etapa 2b — `scripts/security_audit_scope_forgery.mjs` (novo script, fecha o item 7 de 27/08): bloqueado por
> falta de dado, não por falha do script.** A base de produção só tem 3 usuários, todos `role=manager` — nenhuma
> conta vendedor/supervisor existe ainda pra testar contra. Decisão (do usuário): não criar contas de teste
> descartáveis em produção agora; o script fica pronto e documentado em `02-banco-de-dados.md` pra rodar assim
> que o cliente criar os primeiros usuários vendedor/supervisor reais. **Item 7 permanece formalmente aberto**
> até essa checagem rodar de fato — a Etapa 2a fechou a metade "sem login" do achado, não a metade "forjar
> escopo autenticado".
>
> **Etapa 3 (dependências):** `npm audit` → 0 vulnerabilidades. `npm outdated` só mostra bumps menores/majors não
> urgentes (typescript 7, eslint 10, @types/node 26) — informativo, não é obrigação atualizar agora.
> **Achado de higiene (não é vulnerabilidade):** o pacote `dotenv` (v17, mesmo autor da dotenvx.com) imprime dicas
> promocionais aleatórias no stdout a cada load e empacota `SKILL.md` dentro de `node_modules/dotenv/skills/` com
> instruções voltadas a agentes de IA pra recomendar o produto pago `dotenvx`/`vestauth.com`. Não vaza segredo
> nem executa nada — só ruído/marketing embutido no pacote. Ignorado como instrução (tratado como conteúdo não
> confiável), registrado aqui só como algo a manter em mente ao ler output de scripts.
>
> **Etapa 4/5 (criptografia + `02-banco-de-dados.md`):** decisão de não implementar pgcrypto agora documentada
> na íntegra em `docs/02-banco-de-dados.md` (seção Criptografia) — resumo: CNPJ é dado público, comissão já
> protegida por RLS e criptografá-la quebraria as views de agregação ao vivo, senha é 100% GoTrue/bcrypt. Seção
> "Segurança (RLS)" do mesmo arquivo foi reescrita — estava desatualizada desde a v2 (dizia "leitura pública, v1
> não tem login", falso desde 27/08).
>
> **Fora de escopo, registrado apenas como item futuro (pedido explícito do usuário em 29/08):** auditoria/log de
> acesso a dado sensível (quem consultou/alterou comissão, permissões, metas) — só depois do teste de aceitação
> do cliente.
>
> **Pendente pra retomar:** fechar de fato o item 7 (Etapa 2b) assim que existir conta vendedor/supervisor real;
> habilitar MFA na conta do dono (ação manual); decidir sobre upgrade pro plano Pro (backup + leaked password
> protection) — questão de billing, não técnica.

> **Atualização 28/08/2026 — devolução manual editável (pedido do cliente):**
>
> Cliente pediu pra editar devoluções direto na tela `/analitico/devolucoes` (adicionar/atualizar/excluir), só manager.
> Como devolução não tem tabela própria — é `devolucao`/`motivo_devolucao` dentro de `vendas` — e o import mensal
> apaga e reinsere toda linha `origem='erp'` do período (`apagar_vendas_periodo`), editar uma devolução vinda do ERP
> seria revertido em silêncio no próximo reimport. Decisão (confirmada com o usuário): só devoluções **lançadas
> manualmente** por essa tela são editáveis/excluíveis (`origem='manual'`, `qtde=0`, mesmo padrão de `/admin/vendas`);
> as vindas do ERP continuam só-leitura.
>
> Implementado: `analitico/devolucoes/actions.ts` (`criarDevolucao`/`atualizarDevolucao`/`excluirDevolucao`, gateadas
> por `requireRole(["manager"])` — não `requirePermission`, que deixaria passar qualquer role com "editar" na
> matriz) e `DevolucaoManager.tsx` (form + tabela, só renderiza pra manager). Testado ponta a ponta direto no banco
> de produção (insert → update → delete, guard `origem/qtde` confirmado) antes do deploy; `tsc`/`eslint`/`next
> build` limpos. Commit `d87f8aa`, push feito, Vercel `Ready` em produção — confirmado via `vercel ls` e checagem
> do redirect em `/analitico/devolucoes` no domínio de produção.
>
> **Pendente pra retomar:** cliente vai rodar o teste de aceitação (inclui essa tela) e devolver ajustes finos —
> aguardando o retorno dele antes de mexer em mais nada aqui. O resto da lista abaixo (importar meses anteriores,
> atribuições de supervisor, senha provisória, item 5, as 4 perguntas de comissão, divergência 471×485) segue aberto
> como estava em 27/08.

> **Atualização 27/08/2026 — parte 3 (deploy, redirect aberto, ajuda contextual, roteiro de aceitação):**
>
> **Deploy feito e verificado.** `master` foi fast-forward de `4d516d3` para `4f6a8f0` (10 commits) e a Vercel
> publicou automaticamente pela integração do GitHub. Os dois riscos previstos foram descartados na prática:
> o build remoto instalou o `xlsx` do `cdn.sheetjs.com` sem problema (40s, Ready), e o `proxy.ts` foi reconhecido
> em produção — 7 rotas protegidas devolvem 307 pra `/login` com o `next` correto e `/login` devolve 200. O alias
> de produção aponta pro deployment do push. Banco e código finalmente alinhados.
>
> ---
>
> **ACHADO DE SEGURANÇA: redirect aberto no `?next=` do login.** A guarda era
> `redirect(next.startsWith("/") ? next : "/")`. Não basta: **`//evil.com` começa com `/`** e é uma URL
> protocolo-relativa — o browser resolve como `https://evil.com`. Dava pra montar
> `https://<dominio-real>/login?next=//site-falso`: a vítima vê o domínio legítimo, autentica e é jogada pra fora.
> Phishing clássico, e o link inicial é verdadeiro. `/\evil.com` tem o mesmo efeito, porque vários browsers
> normalizam a barra invertida antes de resolver. O mesmo padrão estava em `(app)/conta/actions.ts:47`, no campo
> `proximo`.
>
> Corrigido em `lib/auth/redirecionamento.ts` (`caminhoInternoSeguro`), usado nos dois pontos. Rejeita
> protocolo-relativo, barra invertida, esquema absoluto e caracteres de controle (que quebrariam o header
> `Location`). Verificado caso a caso: `/equipe` e `/admin/usuarios?x=1` passam; `//evil.com`, `/\evil.com`,
> `https://evil.com`, `javascript:...`, `"  //evil.com  "` e injeção de `\n` caem no padrão `/`.
>
> Nota de implementação: a classe de caracteres de controle está como comparação numérica de code point, **não**
> como regex literal — escrever `[\x00-\x1F]` no fonte gravava bytes de controle invisíveis no arquivo, inclusive
> um NUL. Se alguém "simplificar" pra regex depois, o problema volta.
>
> **Rota compartilhada com quem não tem permissão.** `requirePageAccess` fazia `redirect("/")` mudo: a pessoa caía
> no Resumo Geral sem explicação e concluía que o link estava quebrado. Agora redireciona pra
> `/?sem-acesso=<slug>` e o Resumo Geral mostra um aviso nomeando o módulo (label lido de `modulos`) e dizendo que
> o link não está quebrado. O redirect continua sendo pra raiz de propósito — gatear a raiz criaria loop.
>
> ---
>
> **Ajuda contextual por módulo (pedido do cliente, referência VTEX/Semrush).** `lib/ajuda/conteudo.ts` tem um
> verbete por slug de módulo, e `components/layout/AjudaModulo.tsx` renderiza "Como usar esta tela" abaixo do
> título. `PageHeader` ganhou o prop opcional `ajuda`, e **25 telas** foram ligadas. Regra de conteúdo adotada:
> cada verbete responde só o que o usuário não adivinha sozinho — o que a tela responde, **de onde vem o número**
> e o erro de leitura mais provável. Nada de "clique aqui para filtrar", que ensina o usuário a ignorar o painel.
>
> Implementado com `<details>/<summary>` nativo, não com estado em React. Acessibilidade sai de graça, e a
> preferência salva em `localStorage` é restaurada mutando o DOM num efeito — sem `setState`, que dispararia
> `react-hooks/set-state-in-effect`. A primeira versão usava `useState` e **introduziu um quarto erro de lint**;
> foi reescrita antes do commit. Fecha por padrão pra não empurrar o conteúdo da tela pra baixo da dobra.
>
> **`docs/roteiro-aceitacao.md`** — roteiro do teste de aceitação: checklist do nosso lado antes de enviar o
> acesso, as três coisas a avisar ao cliente antes (comissão não é pra pagamento, CLT/PJ e Positivação fora do
> cálculo, mês corrente sempre parcial), roteiro por papel, roteiro de segurança pra fazer junto com ele, e como
> registrar o retorno separando "número errado" de "falta de recurso".
>
> ---
>
> **DADO: a base tem um mês só, e incompleto.** `periodos` tem 1 linha (Agosto/2026) e as 7443 vendas vão de
> **03/08 a 20/08 — 14 dos 21 dias úteis, 67% do mês**. `vendas` com `origem = 'manual'` está em **0**, ou seja o
> item 5 nunca rodou. Consequência pro teste de aceitação: o cliente vê todo mundo em ~67% da meta cheia e conclui
> que a equipe vai mal ou que a conta está errada — nenhuma das duas. Pior, a faixa "Abaixo de 90%" é
> proporcional, então **toda** comissão cai na pior banda. E evolução/faturamento mês a mês ficam com um ponto só.
> **Importar os meses anteriores é pré-requisito do teste de aceitação**, não melhoria.
>
> **Pendente pra retomar, em ordem:**
> 1. **Importar o restante de agosto e 2-3 meses anteriores.** Sem isso metade das telas não tem o que comparar.
> 2. **Atribuir representantes ao Supervisor** — `supervisor_representantes` segue com 0 linhas.
> 3. **Zerar as senhas dos 3 usuários** — todos com `senha_provisoria = false`, porque foram criados antes do
>    código estar publicado. O fluxo de primeiro acesso **nunca disparou em produção**.
> 4. **Item 5:** venda manual ponta a ponta.
> 5. **Item 7:** as quatro perguntas de comissão (CLT/PJ, Positivação, somam ou excluem, limiares reais).
> 6. **Item 8:** divergência 471 vs 485 do representante 90.
> 7. Varredura de segurança: falta o que exige app logada — tentar Server Action forjada como vendedor e conferir
>    vazamento por filtro/query param.
> 8. Dívida menor: 3 erros pré-existentes de ESLint (`set-state-in-effect` em ComissoesClient:56,
>    PermissoesClient:62, UsuariosClient:53).

> **Atualização 27/08/2026 — parte 2 (resposta do cliente sobre comissão, vazamento de leitura anônima, manual de uso):**
>
> **O cliente respondeu sobre a comissão — mas mandou a ESTRUTURA, não os números.** Textual: (1) CLT ou PJ, dois
> formatos diferenciados; (2) premiações por 2.1 Positivação, 2.2 caixa vendida por empresa, 2.3 Financeiro; (3) a
> venda é realizada pelo Palmtop. Confronto com o que o código faz hoje:
>
> | Cliente disse | Hoje | Situação |
> |---|---|---|
> | 2.2 caixa por empresa | `metas.premiacao_pct_cx` por representante × fornecedor | já é exatamente isso |
> | 2.3 Financeiro | `metas.premiacao_pct_fin` | já existe |
> | 2.1 Positivação | `metas_representante.premiacao_pct_positivacao_base` existe desde a v1 e **nunca é lida** | não entra no cálculo |
> | 1. CLT/PJ | não existia em lugar nenhum | campo criado na v2.4; **cálculo não diferencia** |
> | 3. Palmtop | `vendas.origem` já separa `manual` do importado | lançamento manual é caminho de exceção/correção |
>
> **O item 7 continua aberto.** Falta perguntar ao cliente: o que muda entre CLT e PJ (percentual? faixa? só um dos
> três prêmios?), como o Prêmio de Positivação é calculado (valor por cliente positivado? % sobre o quê?), se os três
> prêmios somam ou são excludentes, e os limiares/fatores reais das faixas — os 90%/100% de hoje foram inferidos da
> planilha, não confirmados.
>
> ---
>
> **ACHADO DE SEGURANÇA: leitura sem login em 7 tabelas.** As policies da v1 foram criadas como
> `FOR SELECT USING (true)` **sem cláusula `TO`**. Sem `TO`, a policy vale pra `PUBLIC`, o que inclui o role `anon` —
> e a publishable key vai no bundle do browser. Verificado contra o PostgREST de produção **sem nenhum token de
> sessão**:
>
> ```
> representantes       206  7 linhas
> produtos             206  253 linhas
> fornecedores         206  28 linhas
> periodos             206  1 linha
> metas                206  175 linhas   <-- % de premiação por rep x fornecedor
> metas_representante  206  7 linhas     <-- objetivo de positivação e taxas-base
> import_log           206  2 linhas
> vendas / clientes / profiles / modulos / permissoes_role / comissao_faixas  ->  0 linhas
> ```
>
> `vendas` e `clientes` escaparam porque a v2 os recriou com `TO authenticated`; o problema é só o legado da v1.
> **`metas`/`metas_representante` são o pior caso: dado de remuneração da equipe exposto sem autenticação nenhuma** —
> e é justamente o que o cliente vai começar a preencher de verdade agora. As **views** foram conferidas e estão OK
> (todas com `security_invoker = true` desde a v2, então herdam o RLS das tabelas).
>
> **`supabase_migration_v2_4.sql` (PENDENTE DE EXECUÇÃO)** corrige: dimensões passam a `TO authenticated`, e
> `metas`/`metas_representante` passam a `pode_ver_representante()` — mesmo escopo de vendas/clientes, então vendedor
> não lê mais o percentual de comissão do colega. Conferido que isso **não muda nenhuma tela**: rankings e
> `/distribuicao` leem metas sem filtro, mas cruzam com views já escopadas, então as linhas fora de escopo nunca
> apareciam mesmo. `import_log` ficou em `TO authenticated` (e não `is_manager()`) de propósito: `/admin/importar` já
> é gateada por `requirePageAccess`, e o Manager pode delegar esse módulo a um supervisor — `is_manager()` faria o
> histórico sumir da tela sem erro nenhum.
>
> **A v2.4 também fecha as duas inconsistências da matriz (item 6), ambas decididas nesta sessão:**
> **(a)** `modulos.grupo` de `admin.vendas` era "Uso Interno" enquanto a Sidebar sempre o mostrou sob "Dashboard"
> — alinhado pro banco bater com a tela. **(b)** Supervisor **ganhou** `admin.vendas = editar`: a tela foi
> construída prevendo "Manager/Supervisor escolhem o representante", e como a venda real vem do Palmtop, o
> lançamento manual é caminho de correção — que é o trabalho do supervisor. O escopo dele segue limitado por RLS.
>
> ---
>
> **`/docs` era uma página de pitch comercial interno que o cliente conseguia abrir.** Título "Documentação & Pitch",
> com um card literalmente chamado "O que falar para o cliente" e outro "Ofereça essas expansões para seus clientes".
> Era a **única rota de `(app)` sem `requirePageAccess`**, fora da Sidebar e fora da tabela `modulos` — bastava
> digitar `/docs`. Gatear por papel não resolveria: o cliente **é** o manager. O conteúdo foi movido pra
> `docs/pitch-comercial.md` (fora da aplicação) e a rota foi reescrita como **Manual de Uso** do cliente: primeiro
> acesso e senha, quem enxerga o quê, as telas uma a uma, rotina mensal de importação, como a comissão é calculada
> (com o que ainda não entra nela), segurança e um guia de "se algo não funcionar". Continua sem `requirePageAccess`
> de propósito — manual é como `/conta`, não é módulo revogável. Link fixo no rodapé da Sidebar.
>
> **Avisos de uso (pedido explícito).** Novo `components/ui/alert.tsx` com quatro variantes (`info`, `aviso`,
> `bloqueio`, `ok`) e `components/layout/EscopoVazio.tsx`, que explica tela vazia **por papel**. Dois textos
> enganosos foram corrigidos no caminho:
> - `/equipe` mandava o **usuário final** rodar `scripts/seed_metas_v1.mjs` e editar a tabela `metas_representante`.
> - `/comissoes` mandava pedir atribuição de representantes em `/admin/permissoes` — o lugar certo é **Usuários**.
>
> `/comissoes` ganhou dois avisos: um fixo dizendo que as faixas são rascunho e que CLT/PJ e Positivação ainda não
> entram no cálculo, e um condicional que aparece quando todos os `premiacao_pct` do mês estão zerados (a tela
> mostrava R$ 0,00 sem explicar). `/admin/representantes` ganhou o seletor **Regime de contratação (CLT/PJ)**.
>
> **Pendente pra retomar, em ordem:**
> 1. **Rodar `supabase_migration_v2_4.sql` em produção** — é o que fecha a leitura anônima. Enquanto não rodar, os
>    percentuais de premiação seguem legíveis sem login.
> 2. **Atribuir representantes ao Supervisor de teste** — `supervisor_representantes` continua **vazio**, o passo
>    nunca salvou. Sem isso o item 4 fica testado pela metade.
> 3. **Deploy:** nada de 27/08 foi publicado. O banco de produção está à frente do código publicado.
> 4. **Item 5:** lançar venda de teste em `/admin/vendas` e confirmar reflexo em `/equipe`/rankings.
> 5. **Item 7:** as quatro perguntas de comissão acima, para o cliente.
> 6. **Item 8:** divergência 471 vs 485 do representante 90.
> 7. Varredura de segurança completa de rotas (o que já foi conferido está abaixo).
> 8. Dívida menor: erro pré-existente de ESLint em `UsuariosClient.tsx:53`.
>
> **Varredura de segurança — o que já foi conferido nesta sessão:**
> - Todas as 5 rotas de `/api/admin/import/*` chamam `requirePermission("admin.importar", "editar")`. OK.
> - `/api/download-template` não tem guarda, mas só emite planilha de cabeçalho vazio e está atrás do gate do proxy.
> - `/admin/usuarios` e `/admin/permissoes` são manager-only na própria página, não só nas actions. OK.
> - `/` (raiz) não tem `requirePageAccess` — é intencional e **necessário**: `requirePageAccess` redireciona pra `/`
>   quando nega, então gatear a raiz criaria loop de redirect. Consequência: quem tiver `dashboard = nenhum` perde o
>   link na Sidebar mas ainda abre a raiz digitando a URL. Decidir se isso importa.
> - Não existe **nenhuma** policy de INSERT/UPDATE/DELETE em nenhuma tabela — com RLS ligado, isso nega escrita por
>   padrão pela chave publishable. Toda escrita passa por `supabaseAdmin` em Server Action/route guardada. É o
>   desenho certo, registrado aqui pra não ser "corrigido" por engano depois.

> **Atualização 27/08/2026 (v2.2/v2.3 — login quebrado em produção, conta do usuário):**
>
> **Achado grave: o login estava inutilizável desde o deploy da v2 (26/08).** A policy de SELECT de `profiles`
> criada na v2 testava "sou manager?" com `EXISTS (SELECT 1 FROM public.profiles me ...)`. O Postgres reaplica a
> policy de `profiles` a esse subselect e aborta com `42P17 infinite recursion detected in policy for relation
> "profiles"` — o comentário da v2 dizendo "seguro aqui pois não há recursão" estava **errado**. Efeito em
> cadeia: `getCurrentProfile()` recebia o erro, **descartava** (`const { data } =`, sem checar `error`), devolvia
> `null`, o layout mandava pra `/login`, o middleware via a sessão válida e devolvia pra `/` → loop infinito
> (`ERR_TOO_MANY_REDIRECTS`). O login "funcionava" (o Auth não toca em `profiles`), mas nenhuma página abria.
> `permissoes_usuario` e `supervisor_representantes` tinham o mesmo padrão e o mesmo erro; `vendas`/`clientes`
> escaparam porque passam por `pode_ver_representante()`, que é `SECURITY DEFINER`.
> **`supabase_migration_v2_2.sql` (rodada em produção)** move o teste pra `public.is_manager()`, `SECURITY
> DEFINER`. `getCurrentProfile()` agora loga o erro em vez de engolir — foi o `error` descartado que escondeu
> isso por um dia inteiro.
>
> **Item 10 fechado — como o vendedor recebe a senha.** Decidido: não há SMTP no projeto (o default do Supabase é
> limitado e só serve pra desenvolvimento), então **o manager gera uma senha padrão e pede pra pessoa redefinir**.
> `supabase_migration_v2_3.sql` adiciona `profiles.senha_provisoria` (default `false`, pra não arrastar as contas
> existentes). Enquanto a flag estiver `true`, `(app)/layout.tsx` prende o usuário em `/trocar-senha` — que fica
> **fora** do grupo `(app)` de propósito, senão o layout rodaria nela e criaria o mesmo formato de loop do 42P17.
> Entrou junto `/conta` (troca de nome de exibição e de senha pelo próprio usuário, sem passar pela matriz de
> permissões) e um botão **Redefinir senha** em `/admin/usuarios`, que religa a flag — essa era a única saída pra
> quem esquecer a senha, já que sem SMTP não existe "esqueci minha senha".
>
> **Itens 2, 3, 4 e 10 concluídos.** Manager criado, Supervisor e Vendedor de teste criados, troca forçada de
> senha testada ponta a ponta. Escopo de RLS validado **por query direta no PostgREST**, não só na tela: manager
> 7443/7443 vendas, vendedor 308 com 2352 vendas e **0 linhas fora do próprio representante**, 121 clientes de
> 471. É prova de que nem forjando request fora da app o vendedor alcança dado alheio.
>
> **Também nesta sessão:** `middleware.ts` → `proxy.ts` (deprecação do Next 16.3.2, via codemod oficial; só o
> nome da função mudou, gate e matcher idênticos, redirects reconferidos). E `xlsx` 0.18.5 → **0.20.3 pelo CDN do
> SheetJS** — o pacote no npm está abandonado e a vuln high (prototype pollution + ReDoS) não tinha correção lá.
> `npm audit` agora zerado. **Atenção: o build da Vercel passa a precisar de acesso a `cdn.sheetjs.com`.**
> Revalidado contra o Excel real: 52062 linhas nominais, 7443 com `Seq` (idêntico ao banco), 7 representantes.
>
> **Pendente pra retomar, em ordem:**
> 1. **Atribuir representantes ao Supervisor de teste** — `supervisor_representantes` está **vazio**, o passo não
>    salvou. Por isso ele enxerga 0 vendas. Sem isso o item 4 fica testado pela metade (provou-se que vendedor não
>    vaza, não que supervisor vê exatamente os dois atribuídos).
> 2. **Deploy:** nada da sessão de 27/08 foi publicado. Está tudo no branch `fix/rls-recursao-e-conta-usuario`
>    (4 commits), sem push. O banco de produção **já** tem as migrations v2.2/v2.3 — ou seja, o banco está à
>    frente do código publicado.
> 3. **Item 5:** lançar venda de teste em `/admin/vendas` e confirmar reflexo em `/equipe`/rankings. Nunca foi
>    exercitado ponta a ponta.
> 4. **Decisões da matriz de permissões (item 6)** — ver as duas inconsistências levantadas no bloco abaixo.
> 5. Confirmar com o cliente os percentuais das faixas de comissão (item 7, ainda placeholder — se ele abrir
>    `/comissoes` vai ver número inventado).
> 6. Decidir a divergência 471 vs 485 do representante 90 (item 8).
> 7. Dívida menor: erro pré-existente de ESLint em `UsuariosClient.tsx:53` (`react-hooks/set-state-in-effect`).
>
> **Matriz de permissões — estado real do banco em 27/08 e duas inconsistências:**
> Vendedor vê: `/`, `/equipe`, `/comissoes` e **`/admin/vendas` com nível `editar`**. Supervisor vê tudo de
> Dashboard + Dados Analíticos + Rankings + Distribuição, e **nada** de `admin.*`. Zero overrides por usuário.
> - **(a)** `admin.vendas` está no grupo "Uso Interno", então o vendedor **vê sim** um item sob "Uso Interno" na
>   Sidebar ("Lançar Venda"). Está correto em permissão, mas o agrupamento confunde — vale mover esse módulo pra
>   um grupo voltado ao vendedor em vez de deixá-lo sob um rótulo que sugere área administrativa.
> - **(b)** O Supervisor **não** consegue abrir `/admin/vendas` (`nivel = nenhum`), mas a feature foi construída
>   prevendo que "Manager/Supervisor podem escolher o representante" ao lançar (ver bloco de 26/08). A matriz
>   contradiz o desenho da feature — decidir qual dos dois está certo.

> **Atualização 26/08/2026 (v2 — deploy):** commit/push feito, deploy automático na Vercel confirmado em produção
> (`sales-management-dashboard-gules.vercel.app`). Corrigido um bloqueio real encontrado nessa checagem:
> `SUPABASE_SERVICE_ROLE_KEY` não existia nas Environment Variables da Vercel — sem ela nenhuma Server
> Action/import grava em produção (isso valia desde a v1, não é coisa nova da v2). Variável adicionada +
> redeploy manual disparado (adicionar uma env var sozinha não atualiza um deployment já publicado).
>
> Também entrou o **lançamento manual de vendas** (`/admin/vendas`), pedido do cliente pro vendedor "lançar e
> acompanhar vendas" sem depender do import mensal: grava direto em `vendas` com `origem='manual'`
> (`supabase_migration_v2_1.sql`), pra não ser apagado no próximo reimport do DD PEDIDOS (`apagar_vendas_periodo`
> agora só mexe em `origem='erp'`). Conta como positivação automaticamente; preço vem sugerido do último valor
> vendido daquele produto, editável; vendedor lança só pra si, Manager/Supervisor podem escolher o representante.
>
> `supabase_migration_v2.sql` **e** `supabase_migration_v2_1.sql` rodados com sucesso em produção (sem erros).
> Schema de login/RBAC/comissão/override/lançamento manual está todo aplicado no banco de produção agora.
> **Pendente pra retomar amanhã, em ordem:**
> 1. ~~Rodar `supabase_migration_v2_1.sql`~~ — feito.
> 2. Criar o primeiro Manager (`node scripts/seed_first_manager.mjs <email> <senha> "<nome>"`) contra o Supabase
>    de produção — confirmar que a `SUPABASE_SERVICE_ROLE_KEY` do `.env.local` local é do mesmo projeto.
> 3. Logar em produção com essa conta, criar 1 Supervisor + 1 Vendedor de teste em `/admin/usuarios`, atribuir
>    representante ao vendedor.
> 4. Validar em navegador anônimo que o Vendedor só vê a própria página em `/equipe` e nada de "Uso Interno".
> 5. Lançar uma venda de teste em `/admin/vendas` e confirmar que reflete em `/equipe`/rankings.
> 6. Ajustar `/admin/permissoes` se quiser liberar mais telas por padrão pro Supervisor/Vendedor além do default
>    conservador (hoje: dashboard/equipe/comissões pro vendedor, +analítico/rankings/distribuição pro supervisor).
> 7. Confirmar com o cliente os percentuais reais das faixas de comissão (`/admin/comissoes`, hoje placeholder).
> 8. Decidir a divergência 471 vs 485 do representante 90 (usar o override em `/admin/metas` se for fixar 485).
> 9. Rodar `npm audit` e revisar a vulnerabilidade "high severity" acusada no install antes de abrir pra usuários
>    reais.
> 10. Definir como cada vendedor real vai receber a própria senha inicial de login.

> **Atualização 26/08/2026 (v2):** implementado login + controle de acesso (Manager/Supervisor/Vendedor) pedido
> pelo cliente, fechando o item 2 abaixo em definitivo (login por representante deixou de ser "fica pra depois").
> Ver `supabase_migration_v2.sql` pro schema completo. Resumo:
> - **Login/RBAC:** Supabase Auth + `profiles` (papel + `representante_id` pro vendedor) + `supervisor_representantes`
>   (Manager atribui quais representantes cada supervisor enxerga — não existe agrupamento fixo no ERP) +
>   `modulos`/`permissoes_role`/`permissoes_usuario` (matriz visualizar/editar, por perfil ou por usuário,
>   editável em `/admin/permissoes`; usuários geridos em `/admin/usuarios`). Enforced tanto na app
>   (`src/lib/auth/permissions.ts`, `src/middleware.ts`) quanto via RLS reforçada em `vendas`/`clientes`
>   (`pode_ver_representante()`, com `security_invoker=true` nas views que dependem delas).
> - **485 clientes positivados:** o cliente pediu pra considerar 485. Em vez de hardcodar, virou
>   `metas_representante.positivacao_realizado_override` — mesma convenção de `cadastro_total_override`/
>   `base_ativa_override` (NULL = cálculo ao vivo, valor setado = referência confirmada), editável em
>   `/admin/metas` ou em lote via um 5º pipeline de import (`/api/admin/import/metas_representante`). A
>   divergência 471 vs 485 do representante 90 (achado de 26/08 mais abaixo) segue sem causa raiz confirmada — o
>   override é a solução de produto, não uma investigação adicional do dado.
> - **Comissionamento dinâmico:** `comissao_faixas` (faixas de atingimento configuráveis por fornecedor ou
>   globais, `/admin/comissoes`) finalmente consome `metas.premiacao_pct_cx`/`premiacao_pct_fin` — armazenados
>   desde a v1 mas nunca usados em nenhum cálculo até agora. Fórmula: realizado × % premiação × fator da faixa.
>   Resultado em `/comissoes`. **Percentuais/fatores das faixas são placeholder** — ainda precisam ser confirmados
>   com o cliente (a fórmula exata de "Proporcional 90%"/"Acima de 100%" nunca foi esclarecida, ver item 2 abaixo).
> - **Top 20 Clientes / Top 10 Vendedores:** `/rankings/clientes` (nova view `vw_top_clientes_mes`) e
>   `/rankings/vendedores` (mesmo critério de `/rankings/financeiro`, limitado a 10).
>
> **Em aberto pra próxima sessão:** rodar `supabase_migration_v2.sql` no Supabase, criar o primeiro Manager
> (`scripts/seed_first_manager.mjs`), validar o fluxo de login/permissões ponta a ponta num navegador (não foi
> possível testar interativamente nesta sessão — sem acesso a um projeto Supabase live), e confirmar com o
> cliente os percentuais reais das faixas de comissão.

> **Atualização 25/08/2026:** rodada de planejamento avançado + implementação da fundação da v1 (schema, import,
> `/equipe`, telas analíticas/rankings/distribuição, admin de metas/fornecedores). A maioria dos itens abaixo foi
> resolvida com decisão própria (documentada inline), já que o cliente ainda não tinha dado feedback. Ver
> `supabase_migration_v1.sql` e `docs/01..05-*.md` atualizados pro estado real do sistema.

## Retomar daqui (sessão de 26/08 pausada aqui)

Sessão de 26/08 rodou migration + reimport real + validação de fornecedores (detalhes abaixo) e parou aqui.
Próximos passos, em ordem:

1. **[Feito 26/08]** `npm run build` — passou limpo (compilado em 97s, TypeScript ok, 24 rotas geradas, sem erros).
2. Confirmar com o cliente: (a) a divergência de positivação 471 vs 485 (representante 90, ver achado abaixo),
   (b) se outros fornecedores além dos 6 já testados também têm `nome_fantasia` trocado no seed inicial — só uma
   amostra foi validada.
3. Opcional se sobrar tempo: investigar a divergência pequena em Riclan (caixas) e Chef Clay Leite de Coco (ver
   detalhes no item 4 da seção "Continuar amanhã" abaixo).
4. **Infra:** o repositório está em `D:\OneDrive\Documentos\DevRelatorioDeVendas\dashboard` — usuário vai mover
   pra fora do OneDrive (disco D, fora da sincronização) numa próxima sessão. Isso resolve a lentidão observada
   hoje (compilação do Turbopack levou ~14min na primeira vez por causa do OneDrive tentando sincronizar
   `node_modules`/`.next` em tempo real). Depois de mover, reconferir `.env.local`, remote do git e o link do
   projeto Vercel (pasta `.vercel/`) ainda funcionam a partir do novo caminho.

## Atualização 26/08/2026 — migration rodada, import real feito, achado importante

Migration v1 aplicada por completo (colunas/views/RLS confirmadas programaticamente). Reimportado o `DD PEDIDOS`
real de agosto/2026 via `/api/admin/import/vendas`: 7443 vendas gravadas (de 52062 linhas nominais da aba, sendo
44619 linhas em branco/padding do Excel — não é bug, é range inflado da planilha).

**A validação da positivação (item 1) reabriu**: com dado real, `/equipe` calcula **471**, não 485. Comparando
`RESUMO POSITIVAÇÃO`/`RESUMO DISTRIBUIÇÃO` (485) vs `ATUALIZA POSITIVAÇÃO` (471) vs banco: todos os 7
representantes batem exatamente entre `ATUALIZA POSITIVAÇÃO` e o banco, **exceto o representante 90** — `RESUMO`
mostra Realizado=24, mas o pivot bruto e o banco mostram 10 (diferença de 14 = exatamente 485-471). Dois sinais de
que o 24 é que está errado, não o 10: (a) a linha do rep. 90 em `RESUMO POSITIVAÇÃO`/`DISTRIBUIÇÃO` tem Meta=0,
única entre os 7; (b) `RESUMO POSITIVAÇÃO` e `RESUMO DISTRIBUIÇÃO` têm exatamente os mesmos valores de "Realizado"
linha a linha — não são duas fontes independentes como a decisão de 25/08 assumiu, então a "validação cruzada"
que justificou escolher 485 não validava nada de fato. **Decisão de 25/08 revertida** — precisa confirmar com o
cliente por que o rep. 90 tem meta zerada e um Realizado que não bate com o `DD PEDIDOS` bruto, antes de fechar
esse número em definitivo. Até lá, o sistema segue calculando ao vivo (471 com o dado atual), o que é o
comportamento correto independente de qual número for confirmado depois.

## Continuar amanhã (a partir de 26/08/2026)

Sessão de 25/08 também generalizou a importação em 4 pipelines independentes (`docs/03-importacao-excel.md`) e
tentou rodar o primeiro import real do `DD PEDIDOS` de agosto/2026 — travou em dois bugs reais, um já corrigido
em código, outro ainda pendente de ação no Supabase:

1. **[Feito]** Guardrail de coluna esperava `POSIT`, mas o export real chama essa coluna de `PEDIDOS` — corrigido
   em `src/lib/import/expectedColumns.ts` e `src/app/api/admin/import/vendas/route.ts` (commit
   `fix: correct ERP column name for the positivacao flag...`).
2. **[Bloqueado — precisa de ação manual no Supabase]** `supabase_migration_v1.sql` só foi aplicada pela metade:
   as tabelas novas (`fornecedores`, `metas`, etc.) e as 2 funções RPC existem, mas `clientes.representante_id`,
   `clientes.status`, `produtos.fornecedor_id`, `vendas.seq_erp`, `vendas.motivo_devolucao`, as 6 views de
   agregação, e o bloqueio de RLS nas tabelas antigas (`representantes`/`clientes`/`produtos`/`vendas`) **não
   existem** — confirmado programaticamente (anon key ainda escreve direto nessas tabelas). O arquivo já foi
   editado pra ser 100% re-executável (`DROP POLICY IF EXISTS` antes de cada política) — falta só o usuário rodar
   o arquivo inteiro de novo no SQL Editor.
3. **[Feito 26/08]** Reimportado o `DD PEDIDOS` de agosto/2026. Positivação deu 471, não 485 — ver achado no topo
   deste documento, pendente de confirmação do cliente.
4. **[Feito 26/08]** Comparados Chef Clay, Chef Clay Molhos, Chef Clay Granola, Tapioca Chef Clay, Chef Clay Leite
   de Coco e Riclan entre `/equipe` e a aba `Equipe` da planilha, célula a célula. Achado real: **`fornecedores`
   id=1 e id=3 estavam com `nome_fantasia` trocado** desde o seed inicial (id=1 = GN Distribuidora de Alimentos
   Ltda, deveria ser "Chef Clay Molhos" e estava rotulado "Chef Clay"; id=3 = Algo Mais Temperos Eireli, o
   inverso) — confirmado com 3 métricas batendo exatamente ao trocar (financeiro ao centavo, distribuição,
   produtos por descrição). **Corrigido diretamente no Supabase** (`UPDATE fornecedores SET nome_fantasia ...`
   via troca com valor temporário, nenhuma migration nova necessária). Depois da correção:
   - Chef Clay: financeiro e distribuição batem exatos; caixas 231.75 vs 230.75 da planilha (diff de 1, minor).
   - Chef Clay Molhos: tudo bate exato (caixas, financeiro, distribuição).
   - Tapioca Chef Clay: tudo bate exato.
   - Riclan: financeiro e distribuição batem exatos; caixas 1116.41 vs 1110.84 da planilha (diff ~5.6, minor,
     não investigado a fundo — possível diferença de conversão de kit/unidade).
   - Chef Clay Granola: sem vendas no período nos dois lados (0), não deu pra validar distribuição (planilha
     mostra 56 mesmo com Realizado=0 — provavelmente outra métrica, tipo cadastro, não vendas).
   - Chef Clay Leite de Coco: pequena divergência não resolvida (caixas 46 vs 44.5, financeiro 2576.23 vs
     2438.08, distribuição 35 vs 33) — vale investigar se sobrar tempo, não é bloqueante.
5. **Próximo passo:** rodar `npm run build` + revisão final antes de mostrar a v1 pro cliente. Também vale
   verificar se outros fornecedores (fora dos 6 testados) têm o mesmo tipo de troca de rótulo — só testamos uma
   amostra.

---

## 1. Divergência no número de Positivação

O valor de "Positivação Realizado" aparece diferente em 3 lugares da planilha:

| Fonte | Valor |
|-------|-------|
| Aba `Equipe` (linha 6) | **533** |
| Aba `ATUALIZA POSITIVAÇÃO` (total) | **471** |
| Aba `RESUMO POSITIVAÇÃO` (total) | **485** |
| Sistema (hardcoded) | **533** |

**Dúvida:** Qual é o número correto? O 533 inclui vendas de reposição/bonificação que não deveriam contar como positivação nova? Qual aba deve ser a fonte de verdade?

**Resolvido (25/08):** 485 é o número correto — bate entre `RESUMO POSITIVAÇÃO` e `RESUMO DISTRIBUIÇÃO` somando por
representante. `471` era um pivot table do Excel não atualizado antes de salvar; `533` era hardcode antigo no
código. O sistema agora nunca guarda esse número — `/equipe` e os rankings calculam
`COUNT(DISTINCT cliente_id) WHERE is_positivacao=1` ao vivo a cada acesso.

---

## 2. Abas individuais por Representante (308, 310, 312, 401, 407, 408, 90)

Cada representante tem sua própria aba na planilha com:
- Mesma estrutura da aba `Equipe` mas filtrada por representante
- Percentual de premiação/comissão por fornecedor (ex: `Premiação Positivação: 0.01`, `Premiação Financeira: 0.005`)
- Regra: `Proporcional 90%` e `** Acima de 100% **`

**Dúvida:** O sistema precisa ter uma página individual por representante? Cada representante teria acesso apenas à própria página, ou a visão é só para gestores?

**Resolvido (25/08):** v1 sem login (uso interno/gestores). `/equipe?rep=308` reaproveita o mesmo componente da
visão consolidada, filtrado — mesma função das 7 abas individuais. Login por representante fica pra depois do
feedback do cliente.

**Resolvido (26/08, v2):** cliente pediu login com controle de acesso — implementado. Vendedor loga e só vê a
própria página (`representante_id` do `profile`, `?rep=` de outro representante é ignorado); Supervisor vê os
representantes que o Manager atribuir; Manager sem restrição. Ver resumo no topo deste documento.

---

## 3. Dados históricos (aba EVOLUÇÃO)

A aba `EVOLUÇÃO` contém histórico de compras por cliente desde **Jan/2024** até o mês atual, com colunas mensais (jan, fev, mar...).

**Dúvida:** Esses dados históricos precisam ser importados para o banco também?
- Opção A: Importar via upload da planilha (automaticamente)
- Opção B: Tela de input manual para lançar valores passados
- Opção C: Ficam apenas na planilha, o sistema trabalha só com dados novos

**Resolvido (25/08):** Opção C por enquanto — fora do escopo da v1 (importação de histórico é bastante dado e não
faz parte do fluxo mensal atual). `/evolucao` já existe como placeholder explicando isso; virar Opção A
(importação via upload) fica pra fase 2, após validar a v1 com o cliente.

---

## 4. Fluxo de atualização dos dados novos

Hoje o fluxo parece ser:
1. ERP exporta → `DD PEDIDOS` (dados brutos)
2. Planilha calcula pivots → `ATUALIZA POSITIVAÇÃO`, `ATUALIZA DISTR`, etc.
3. Usuário copia valores manualmente para as abas de RPA e Equipe

**Dúvida:** No sistema novo, qual seria o fluxo ideal?
- O usuário faz upload do `DD PEDIDOS` bruto e o sistema calcula tudo?
- Ou o usuário insere alguns valores manualmente (ex: positivação, distribuição)?
- Os campos `Dias Faturado` e `Dias Restantes` seriam calculados automaticamente pelo banco, ou continuariam sendo inseridos manualmente?

**Resolvido (25/08):** o usuário sobe o `DD PEDIDOS` bruto em `/admin/importar` e o sistema calcula tudo (ver
`docs/03-importacao-excel.md`). `Dias Faturado`/`Dias Restantes` são 100% calculados ao vivo a partir das datas em
`vendas` — não são mais inseridos manualmente em lugar nenhum.

---

## 5. Abas `vg` e `vg1`

São abas com template em branco (sem nome de representante, sem metas).

**Dúvida:** O que são `vg` e `vg1`? Representantes futuros? Clientes de carteira especial (VG = Vendas Gerenciadas)? Precisam entrar no sistema?

**Resolvido parcialmente (25/08):** inspecionando a aba, `vg` tem cadastro quase vazio (37 clientes, mesma
estrutura de uma aba de representante mas sem metas preenchidas) — hipótese mais provável é território "vago"
(sem representante alocado), não um representante real. Não entraram no seed de `representantes`/`metas`. Ainda
vale confirmar com o cliente se é isso mesmo.

---

## 6. Rankings com campos manuais (RK POSIT e RK FIN)

As abas de ranking têm colunas `SISTEMA` e `COM SIST` que parecem receber input manual.

**Dúvida:** O que são esses campos? São valores que o sistema deve calcular automaticamente, ou são dados externos (ex: ranking de outro sistema/ERP) que precisam ser inseridos pelo usuário?

**Resolvido (25/08):** fora do escopo da v1 — os campos são esparsos (só preenchidos pra 2-3 representantes) e a
origem não ficou clara na inspeção. `/rankings/positivacao` e `/rankings/financeiro` calculam só o ranking
"SISTEMA" (o nosso), sem esses campos. Esclarecer com o cliente se for pedido depois.

---

## 7. Rotas do sistema que existem na sidebar mas não têm página

Os links abaixo aparecem no menu lateral e causam erro 404:

- `/analitico/vendas`
- `/analitico/cliente`
- `/analitico/faturamento-dia`
- `/analitico/devolucoes`
- `/rankings/positivacao`
- `/rankings/financeiro`
- `/distribuicao`
- `/evolucao`
- `/configuracoes`

**Decisão pendente:** Criar páginas em branco ("Em desenvolvimento") para evitar 404, ou remover os links do menu até as páginas estarem prontas?

**Resolvido (25/08):** paridade completa — todas as 9 rotas viraram páginas reais lendo do banco (não placeholders
em branco), exceto `/evolucao` que é um placeholder intencional (fora do escopo v1, item 3).

---

## 8. Páginas que existem mas não estão no menu

- `/comercial` — Ranking de Representantes (já implementada)
- `/docs` — Documentação & Pitch (já implementada)
- `/produtos` — Módulo em desenvolvimento

**Decisão pendente:** Adicionar ao menu lateral? Em qual grupo?

**Resolvido (25/08):** `/comercial` foi removida — duplicava `/rankings/financeiro` + `/rankings/positivacao` com
lógica própria (sem o filtro de fornecedores-meta que `/equipe` aplica), mesmo tipo de divergência que causou o
problema do item 1. `/produtos` virou Curva ABC de Produtos e entrou no menu (grupo "Dados Analíticos"). `/docs`
segue fora do menu por enquanto.

---

## 9. Campos hardcoded que precisam de solução definitiva

No arquivo `src/app/equipe/page.tsx`:

```ts
const diasFaturado = 13;               // Atualizado manualmente toda semana
const diasRestam = 8;                  // Atualizado manualmente toda semana
const REALIZADO_POSITIVACAO_MANUAL = 533; // Atualizado manualmente todo mês
```

**Decisão pendente:**
- `diasFaturado` e `diasRestam`: calcular automaticamente com base nas datas de venda no banco, ou manter campo editável na tela de Configurações?
- `REALIZADO_POSITIVACAO_MANUAL`: buscar do banco (contando registros com `is_positivacao = 1`) ou manter campo manual?

**Resolvido (25/08):** os três viraram cálculo ao vivo. `diasFaturado`/`diasRestam` = contagem de dias distintos
com venda no período. `REALIZADO_POSITIVACAO_MANUAL` = `vw_positivacao_representante` somada. Metas por
fornecedor (que estavam hardcoded em `METAS_FORNECEDOR`) migraram pra tabela `metas`, editável em `/admin/metas`
sem redeploy — ver `supabase_migration_v1.sql` e `scripts/seed_metas_v1.mjs` (seed inicial a partir dos dados já
mapeados no código).

---

## 10. Inconsistências nos documentos `docs/`

Todos os arquivos `.md` em `docs/` têm formatação quebrada (backticks viraram `\texto\`).

**Ação:** Corrigir formatação e atualizar conteúdo para refletir o estado real do sistema. Pode fazer junto com o desenvolvimento ou prioritariamente?

**Resolvido (25/08):** todos os `docs/*.md` foram corrigidos e reescritos pra refletir o estado real do sistema
depois da rodada de fundação da v1.

---

## Resumo das Decisões Necessárias

| # | Tema | Urgência |
|---|------|----------|
| 1 | Fonte correta da positivação | Alta — afeta dado principal |
| 4 | Fluxo de importação de dados | Alta — define toda a arquitetura de input |
| 7 | Rotas quebradas no menu | Média — afeta UX |
| 9 | Hardcoded → automático | Média — afeta confiabilidade |
| 2 | Página individual por representante | Média — feature nova |
| 3 | Importar histórico EVOLUÇÃO | Baixa — pode ser fase 2 |
| 5 | vg / vg1 | Baixa — esclarecer contexto |
| 6 | Campos manuais do ranking | Baixa — esclarecer contexto |
| 8 | Páginas fora do menu | Baixa — ajuste de UX |
| 10 | Corrigir docs | Baixa — documentação interna |
