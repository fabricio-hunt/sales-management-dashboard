# Banco de Dados (Supabase)

Nosso banco é gerenciado pelo **Supabase**, usando PostgreSQL. Desenhado pra comportar o histórico de vendas mensal
de forma performática, com uma única fonte bruta (`vendas`) e tudo mais calculado ao vivo via views — nunca copiado
entre telas (ver `04-regras-de-negocio.md` pra o porquê disso ser a regra central do sistema).

## Tabelas de dimensão

- **`representantes`**: `id` (código do ERP, ex: "308"), `nome`, `supervisor`.
- **`clientes`**: `id` (Cód. Pessoa), `razao_social`, `fantasia`, `cnpj`, `municipio`, `uf`, `representante_id`
  (carteira — só setado automaticamente se ainda `NULL`, edição manual em `/admin/clientes` nunca é sobrescrita
  pelo import), `status` (`ativo`/`inativo`).
- **`fornecedores`**: `id`, `nome_fantasia`, `ativo`.
- **`fornecedor_aliases`**: mapeia a razão social bagunçada do ERP (`razao_social_erp`) pro `fornecedor_id`
  correspondente. Fornecedores novos detectados no import são auto-criados como `[Revisar] <razão social>` e
  aparecem numa fila de revisão em `/admin/fornecedores`.
- **`produtos`**: `id` (Código Produto), `descricao`, `fornecedor_nome` (bruto, auditoria), `fornecedor_id`.

## Tabela fato: `vendas`

Um registro por item de pedido faturado.

- `venda_liq` (numeric): valor líquido da venda.
- `qtde` (numeric): volume em caixas/unidades.
- `data_venda` (date): data da transação.
- `is_positivacao` (int): flag 0/1 vinda direto do ERP (coluna `PEDIDOS` no export `DD PEDIDOS`, apesar do nome) —
  mantida como está, nunca recalculada em v1 (ver `04-regras-de-negocio.md`).
- `cliente_id`, `representante_id`, `produto_id`: referências às dimensões.
- `seq_erp`, `motivo_devolucao`: auditoria/detalhe vindos do export.

## Configuração mensal (substituem hardcode no código)

- **`periodos`**: um registro por mês (`mes` = sempre dia 1) com `data_inicio`, `data_fim`, `dias_uteis`, `regiao`.
  Editável em `/configuracoes`.
- **`metas`**: meta por **representante × fornecedor × mês** (`meta_cx`, `meta_dia_cx`, `meta_fin`, `preco_medio`,
  `desafio_dist`, `premiacao_pct_cx`, `premiacao_pct_fin`). Editável em `/admin/metas`.
- **`metas_representante`**: objetivos que não são por fornecedor — `obj_positivacao`, e overrides manuais de
  `cadastro_total`/`base_ativa` (a origem exata desses dois números no ERP não foi confirmada com o cliente; por
  padrão eles são contados a partir de `clientes`, mas um valor aqui tem prioridade).
- **`import_log`**: uma linha por execução de qualquer um dos 4 imports (`tipo`, `arquivo_nome`, `sucesso`,
  `linhas_processadas`, `linhas_ignoradas`, `periodo_inicio/fim`, `detalhes` jsonb). Alimenta a seção "Últimas
  importações" em `/admin/importar` — ver `03-importacao-excel.md`.

## Views de agregação

Tudo que a planilha calculava via pivot manual (positivação, distribuição, financeiro por fornecedor) vira uma
`VIEW` sobre `vendas`, consultada ao vivo pelas telas:

- `vw_realizado_rep_fornecedor`, `vw_realizado_equipe_fornecedor`
- `vw_faturamento_diario`
- `vw_positivacao_representante`, `vw_financeiro_representante`
- `vw_vendas_cliente_dia`

Ver `supabase_migration_v1.sql` (raiz do projeto) pra o DDL completo — inclui também as funções
`apagar_vendas_periodo` e `atribuir_representante_se_vazio` usadas pelo import (ver `03-importacao-excel.md`).

## Segurança (RLS)

Estado real, verificado programaticamente em 30/08/2026 (`scripts/security_audit_rls_anon.mjs`) e via consulta
direta a `pg_policies` — não apenas o que a migration deveria ter feito:

- **Login obrigatório (Supabase Auth) para qualquer leitura** — nenhuma tabela tem policy de `SELECT` sem `TO` ou
  com `TO public`. As 16 tabelas do schema (incluindo as 8 do achado de 27/08 — `representantes`, `produtos`,
  `fornecedores`, `fornecedor_aliases`, `periodos`, `metas`, `metas_representante`, `import_log`) retornam 0 linhas
  pra uma requisição PostgREST sem sessão, usando só a `anon key` pública do bundle do browser.
- **Dimensões** (`representantes`, `produtos`, `fornecedores`, `periodos`, `fornecedor_aliases`, `import_log`,
  `modulos`, `permissoes_role`) — liberadas pra qualquer usuário `authenticated`.
- **Tabelas escopadas por representante** (`vendas`, `clientes`, `metas`, `metas_representante`) — via
  `pode_ver_representante()` (`SECURITY DEFINER`, `supabase_migration_v2.sql:135-155`), que resolve o escopo do
  vendedor (só o próprio `representante_id`) e do supervisor (via `supervisor_representantes`).
- **`profiles`/`permissoes_usuario`/`supervisor_representantes`** — via `is_manager()` (`SECURITY DEFINER`,
  `supabase_migration_v2_2.sql`, corrige a recursão de RLS que derrubou o login em produção por um dia em 27/08).
- **Escrita:** nenhuma policy de `INSERT`/`UPDATE`/`DELETE` para `authenticated`/`anon` em nenhuma tabela —
  desenho intencional. Toda escrita passa pela service role key (`supabaseAdmin.ts`), usada só server-side em
  Server Actions/rotas guardadas por `requirePermission`/`requireRole` (`src/lib/auth/permissions.ts`), nunca no
  bundle do browser.
- Referências: `supabase_migration_v2.sql`, `v2_2.sql`, `v2_4.sql` (não só a v1, que este documento descrevia
  incorretamente até 30/08/2026).

**Scripts de auditoria repetíveis** (rodar a cada mudança futura de RLS):

```bash
node scripts/security_audit_rls_anon.mjs       # confirma que nenhuma tabela vaza sem login
node scripts/security_audit_scope_forgery.mjs  # confirma que vendedor/supervisor não veem fora do escopo
```

O segundo script exige contas de teste vendedor/supervisor (`TEST_*` em `.env.local`, nomes em `.env.example`) —
não existiam em produção em 30/08/2026 (só 3 contas manager), então essa verificação específica ficou pendente
até o cliente criar os primeiros usuários desses papéis (ver `PENDENCIAS.md`).

**Auto-cadastro (signup) desabilitado** no painel Supabase (Authentication > Sign In / Providers > "Allow new
users to sign up") desde 30/08/2026 — o app nunca chama `supabase.auth.signUp()` (só `admin.createUser`,
restrito a manager), então deixar esse endpoint público aberto não tinha uso legítimo, só expunha uma superfície
de auto-cadastro/enumeração de e-mail sem necessidade.

## Criptografia

- **Em repouso:** Supabase gerencia AES-256 no armazenamento subjacente (Postgres gerenciado) — fora do
  controle/configuração do projeto.
- **Em trânsito:** HTTPS/TLS obrigatório via `supabase-js`/PostgREST; nenhum script do projeto abre conexão
  direta ao Postgres (confirmado — só `@supabase/supabase-js` em todo o código), então não há ponto que pudesse
  não forçar SSL.
- **Senha:** nunca passa por coluna própria — 100% GoTrue/bcrypt nativo do Supabase Auth. Não há script de
  "criptografia de senha" pra escrever; o hash acontece dentro do Supabase Auth antes da gravação, e o app só
  envia a senha em texto plano por HTTPS até lá (nunca a lê de volta).
- **Decisão explícita de não usar pgcrypto agora:**
  - CNPJ (`clientes.cnpj`) é dado de pessoa jurídica, já publicamente consultável na Receita Federal —
    criptografá-lo não reduz risco real e quebraria buscas/índices por CNPJ nas telas existentes.
  - Percentual de comissão é o dado mais sensível de fato, mas já protegido por RLS escopada
    (`pode_ver_representante()`); criptografia de coluna quebraria as views de agregação
    (`vw_realizado_rep_fornecedor` etc.), que leem essas colunas ao vivo — contrariando o princípio central do
    sistema ("tudo calculado ao vivo via view", `01-arquitetura.md`).
  - **Gatilho futuro registrado:** se um dado genuinamente sensível for adicionado depois (conta bancária pra
    pagamento de comissão, CPF de representante PJ individual), `pgcrypto` está disponível no Postgres gerenciado
    do Supabase (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) — melhor habilitar no momento de criar a coluna do
    que migrar dado já em cleartext depois.
