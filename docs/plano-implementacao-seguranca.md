# Plano de Implementação — Segurança de Banco de Dados

Documento gerado em 29/08/2026 para execução na sessão de 30/08/2026. Escopo já negociado e
aprovado com o usuário (dono do projeto) — não reabrir escopo, só executar. Ver histórico completo
de achados em `docs/PENDENCIAS.md`.

## Contexto (por que agora)

O cliente está prestes a validar o sistema com dado real de remuneração da equipe
(`docs/roteiro-aceitacao.md`). Há histórico recente de dois achados graves na mesma área:

1. **27/08/2026** — 8 tabelas (`representantes`, `produtos`, `fornecedores`, `fornecedor_aliases`,
   `periodos`, `metas`, `metas_representante`, `import_log`) tinham policies `FOR SELECT USING (true)`
   **sem cláusula `TO`**, o que as tornava legíveis por qualquer requisição anônima ao PostgREST
   usando só a `anon key` do bundle do browser. `metas`/`metas_representante` (percentual de comissão)
   eram o pior caso. Corrigido em `supabase_migration_v2_4.sql`, aplicado em produção segundo
   `PENDENCIAS.md` (28/08) — **mas nunca reconfirmado programaticamente**, só de memória/documento.
2. **27/08/2026** — recursão infinita de RLS em `profiles` derrubou o login em produção por um dia;
   corrigida na v2.2 com `is_manager() SECURITY DEFINER`.

O item 7 de `PENDENCIAS.md` ("varredura de segurança: falta o que exige app logada — tentar Server
Action forjada como vendedor e conferir vazamento por filtro/query param") está aberto desde 27/08 e
nunca foi fechado.

## Escopo confirmado com o usuário (29/08/2026)

- **Criptografia = endurecer o que já existe e documentar**, não construir infraestrutura nova.
  Sem pgcrypto, sem coluna criptografada agora.
- **Varredura completa** = fechar o item pendente do PENDENCIAS.md + revisar configurações do
  painel Supabase + revisar dependências.
- **Fora de escopo por pedido explícito:** auditoria/log de acesso a dados sensíveis (quem
  consultou/alterou comissão, permissões, metas). Só citar como item futuro, para depois do teste de
  aceitação com o cliente. Não desenhar solução agora.

## O que já está confirmado (não reinvestigar)

- Nenhuma dependência `pg`/connection string direta ao Postgres em nenhum script — tudo fala com o
  PostgREST via `@supabase/supabase-js` (HTTPS obrigatório). Não há ponto de código que pudesse abrir
  conexão sem SSL.
- `is_manager()` (`supabase_migration_v2_2.sql`) e `pode_ver_representante()`
  (`supabase_migration_v2.sql:136-140`) já têm `SECURITY DEFINER` + `SET search_path = public`
  fixado, sem SQL dinâmico — não exploráveis por manipulação de `search_path`.
- `supabaseAdmin.ts` só usa a service role key server-side; `.gitignore` cobre `.env*` exceto
  `.env.example`; nenhum segredo real encontrado versionado (busca por `service_role`, `sb_secret_`,
  senha hardcoded veio vazia).
- Não existe nenhuma policy de INSERT/UPDATE/DELETE para `anon`/`authenticated` em nenhuma tabela —
  desenho intencional (toda escrita passa por `supabaseAdmin` em Server Actions/rotas guardadas por
  `requirePermission`/`requireRole`). **Não mexer nisso** a menos que a varredura prove que está
  quebrado.
- `package.json` confirma `xlsx@0.20.3` via CDN do SheetJS (`cdn.sheetjs.com`), não o pacote npm
  abandonado — mitigação da vuln high de prototype pollution/ReDoS segue no lugar.

## Ordem de execução

1. Etapa 3 (dependências) — rápida, sem dependências de nada.
2. Etapa 1 (checklist do painel Supabase) — pode rodar em paralelo com o resto.
3. Etapa 2a (RLS anônima) antes de 2b (forja de escopo autenticado) — se uma tabela ainda vazar sem
   login, não faz sentido testar a camada seguinte sobre uma base já comprometida.
4. Etapa 4 (documentação de criptografia).
5. Etapa 5 (corrigir `02-banco-de-dados.md`) — depende do resultado real de 2a/2b, não do que a
   migration deveria ter feito.
6. Etapa 6 (fechar `PENDENCIAS.md`) — por último, resume tudo.

Nenhuma etapa exige migration `.sql` nova a menos que a Etapa 2 encontre uma regressão real — nesse
caso a correção é reaplicar o trecho específico já existente em `supabase_migration_v2_4.sql`, não
criar uma v2.5.

---

## Etapa 1 — Checklist manual no painel do Supabase

Sem código. Marcar cada item como feito, ou decidido não mudar (com o porquê), e registrar o
resultado na entrada nova de `PENDENCIAS.md` (Etapa 6).

| # | Onde | Checar | Ação se errado |
|---|------|--------|-----------------|
| 1.1 | Account > Security | MFA na conta do dono do projeto | Habilitar TOTP |
| 1.2 | Project Settings > Database > Backups | Backup diário / PITR habilitado | Habilitar |
| 1.3 | Project Settings > Database > Network Restrictions | Conexão direta Postgres (5432/6543) sem restrição de IP | Considerar restringir — hoje ninguém usa conexão direta ao Postgres |
| 1.4 | Authentication > Policies (Password) | Comprimento mínimo de senha (hoje `scripts/seed_first_manager.mjs` só valida `>= 6`) | Subir para 8+ no painel |
| 1.5 | Authentication > Policies | "Leaked password protection" (HaveIBeenPwned) | Habilitar |
| 1.6 | Authentication > Rate Limits | Rate limit de login ativo (não custom/desabilitado) | Confirmar default |
| 1.7 | Authentication > Sessions | Expiração de sessão / refresh token rotation | Confirmar rotation habilitada |
| 1.8 | Project Settings > API | Key no `.env.local`/Vercel é `anon`, não `service_role`; `service_role` real só no Vercel server env | — |

---

## Etapa 2 — Scripts de verificação programática (`scripts/`)

Seguir o padrão de `scripts/seed_first_manager.mjs`: `dotenv` carregando `.env.local`,
`@supabase/supabase-js`, `process.exit(1)` em falha.

### 2a. `scripts/security_audit_rls_anon.mjs` — reconfirma o achado de 27/08 fechado

Esqueleto:

```js
// Reconfirma que nenhuma tabela é legível sem sessão (achado de 27/08, corrigido na v2.4).
// Uso: node scripts/security_audit_rls_anon.mjs

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

const TABELAS_QUE_DEVEM_EXIGIR_LOGIN = [
  "representantes", "produtos", "fornecedores", "fornecedor_aliases",
  "periodos", "metas", "metas_representante", "import_log",
  "vendas", "clientes", "profiles", "comissao_faixas",
  "modulos", "permissoes_role", "permissoes_usuario", "supervisor_representantes",
];

async function main() {
  let falhou = false;
  for (const tabela of TABELAS_QUE_DEVEM_EXIGIR_LOGIN) {
    const { count, error } = await supabase
      .from(tabela)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`OK  ${tabela}: erro esperado sem sessão (${error.message})`);
      continue;
    }
    if (count === 0) {
      console.log(`OK  ${tabela}: 0 linhas sem sessão`);
    } else {
      falhou = true;
      console.error(`FALHA  ${tabela}: ${count} linhas legíveis sem login!`);
    }
  }

  if (falhou) {
    console.error("\nFALHA — pelo menos uma tabela legível sem sessão. Corrigir policy antes de prosseguir.");
    process.exit(1);
  }
  console.log("\nOK — nenhuma tabela legível sem sessão.");
}

main();
```

**Complementar (manual, não automatizar):** no SQL Editor do painel Supabase, rodar:

```sql
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Confirmar que toda policy de SELECT das 8 tabelas do achado de 27/08 tem `roles = {authenticated}`,
nunca `{public}`. Não vale criar uma função `SECURITY DEFINER` nova só para expor isso via PostgREST —
é uma checagem pontual, não infraestrutura recorrente.

### 2b. `scripts/security_audit_scope_forgery.mjs` — fecha o item 7 do PENDENCIAS.md

Pré-requisito: adicionar em `.env.local` (nunca commitar valor real) as credenciais das contas de
teste já existentes (Manager/Supervisor/Vendedor). Adicionar os **nomes** das chaves em
`.env.example`, sem valor:

```
TEST_MANAGER_EMAIL=
TEST_MANAGER_PASSWORD=
TEST_SUPERVISOR_EMAIL=
TEST_SUPERVISOR_PASSWORD=
TEST_VENDEDOR_EMAIL=
TEST_VENDEDOR_PASSWORD=
```

Esqueleto do script (ataca a camada de RLS via PostgREST autenticado — é a barreira que realmente
impede o vazamento; forjar o encoding interno de Server Actions do Next tem baixo valor de sinal
comparado a isso, e é o mesmo método já usado manualmente em 27/08):

```js
// Loga como Vendedor e Supervisor de teste e tenta ler/escrever fora do escopo,
// simulando filtro/query param manipulado. Fecha o item 7 de docs/PENDENCIAS.md (27/08).
// Uso: node scripts/security_audit_scope_forgery.mjs

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function logarComo(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falhou para ${email}: ${error.message}`);
  return { client, userId: data.user.id };
}

async function testarEscopo(nome, client, representanteIdEsperado, representantesPermitidos) {
  let ok = true;

  for (const tabela of ["vendas", "clientes", "metas"]) {
    const { data, error } = await client.from(tabela).select("representante_id");
    if (error) {
      console.log(`OK  [${nome}] ${tabela}: erro ao ler (${error.message})`);
      continue;
    }
    const foraDeEscopo = data.filter((r) => !representantesPermitidos.includes(r.representante_id));
    if (foraDeEscopo.length > 0) {
      ok = false;
      console.error(`FALHA  [${nome}] ${tabela}: ${foraDeEscopo.length} linhas fora do escopo!`);
    } else {
      console.log(`OK  [${nome}] ${tabela}: ${data.length} linhas, todas dentro do escopo`);
    }
  }

  // Tentativa de escrita direta (sem passar pela Server Action) — deve falhar por policy.
  const { error: insertError } = await client.from("vendas").insert({
    representante_id: representanteIdEsperado,
    data_venda: "2026-01-01",
    venda_liq: 1,
    qtde: 1,
  });
  if (insertError) {
    console.log(`OK  [${nome}] insert direto em vendas bloqueado (${insertError.message})`);
  } else {
    ok = false;
    console.error(`FALHA  [${nome}] insert direto em vendas foi aceito sem passar pela Server Action!`);
  }

  return ok;
}

async function main() {
  let tudoOk = true;

  // --- Vendedor ---
  const vendedor = await logarComo(process.env.TEST_VENDEDOR_EMAIL, process.env.TEST_VENDEDOR_PASSWORD);
  const { data: profileVendedor } = await admin
    .from("profiles")
    .select("representante_id")
    .eq("id", vendedor.userId)
    .single();
  tudoOk = (await testarEscopo("Vendedor", vendedor.client, profileVendedor.representante_id, [profileVendedor.representante_id])) && tudoOk;

  // supabase.rpc direto na função SECURITY DEFINER
  const { data: podeProprio } = await vendedor.client.rpc("pode_ver_representante", { p_representante_id: profileVendedor.representante_id });
  const { data: podeOutro } = await vendedor.client.rpc("pode_ver_representante", { p_representante_id: "___id_de_outro_representante___" });
  console.log(podeProprio === true ? "OK  [Vendedor] pode_ver_representante(próprio) = true" : "FALHA  pode_ver_representante(próprio) deveria ser true");
  console.log(podeOutro === false ? "OK  [Vendedor] pode_ver_representante(outro) = false" : "FALHA  pode_ver_representante(outro) deveria ser false");
  tudoOk = tudoOk && podeProprio === true && podeOutro === false;

  // --- Supervisor ---
  const supervisor = await logarComo(process.env.TEST_SUPERVISOR_EMAIL, process.env.TEST_SUPERVISOR_PASSWORD);
  const { data: profileSupervisor } = await admin
    .from("profiles")
    .select("id")
    .eq("id", supervisor.userId)
    .single();
  const { data: atribuidos } = await admin
    .from("supervisor_representantes")
    .select("representante_id")
    .eq("supervisor_id", profileSupervisor.id);
  const idsPermitidos = atribuidos.map((r) => r.representante_id);
  tudoOk = (await testarEscopo("Supervisor", supervisor.client, idsPermitidos[0], idsPermitidos)) && tudoOk;

  if (!tudoOk) {
    console.error("\nFALHA — vazamento de escopo encontrado. Corrigir RLS antes de fechar a sessão.");
    process.exit(1);
  }
  console.log("\nOK — nenhum vazamento de escopo encontrado.");
}

main().catch((err) => {
  console.error("Erro ao rodar a varredura:", err.message ?? err);
  process.exit(1);
});
```

Ajustar nomes de coluna/tabela exatos (`supervisor_id` em `supervisor_representantes`, etc.)
conferindo contra `supabase_migration_v2.sql` antes de rodar — o esqueleto acima é o formato,
não copiar sem revisar contra o schema real.

**Como verificar ambos:**

```bash
node scripts/security_audit_rls_anon.mjs
node scripts/security_audit_scope_forgery.mjs
```

Rodar 2a antes de 2b. Qualquer `FALHA` é achado real — corrigir a policy específica (reaplicando o
trecho relevante de `supabase_migration_v2_4.sql`) antes de prosseguir para as próximas etapas.

---

## Etapa 3 — Revisão de dependências

```bash
cd dashboard
npm audit
npm outdated
```

- Comparar `npm audit` contra o "zerado" da atualização de 27/08 (`PENDENCIAS.md`).
- `package.json` já confirmado apontando pro CDN do SheetJS (`xlsx@0.20.3`), não o pacote npm
  abandonado — só reconfirmar que não regrediu.
- `npm outdated` é só leitura informativa — não é obrigação atualizar tudo nesta sessão.

**Como verificar:** `npm audit` retorna 0 vulnerabilidades, ou lista explícita de exceções aceitas
e por quê (mesmo padrão já usado para o `xlsx`).

---

## Etapa 4 — Decisão e documentação sobre criptografia (sem código novo)

Adicionar em `docs/02-banco-de-dados.md` uma subseção "Criptografia" (dentro da seção Segurança,
ver Etapa 5) com o seguinte conteúdo:

- **Em repouso:** Supabase gerencia AES-256 no armazenamento subjacente (Postgres gerenciado) —
  fora do controle/configuração do projeto.
- **Em trânsito:** HTTPS/TLS obrigatório via `supabase-js`/PostgREST; nenhum script do projeto abre
  conexão direta ao Postgres (confirmado — só `@supabase/supabase-js` em todo o código), então não
  há ponto que pudesse não forçar SSL.
- **Decisão explícita de não usar pgcrypto agora:**
  - CNPJ (`clientes.cnpj`) é dado de pessoa jurídica, já publicamente consultável na Receita
    Federal — criptografá-lo não reduz risco real e quebraria buscas/índices por CNPJ nas telas
    existentes.
  - Percentual de comissão é o dado mais sensível de fato, mas já protegido por RLS escopada
    (`pode_ver_representante()`); criptografia de coluna quebraria as views de agregação
    (`vw_realizado_rep_fornecedor` etc.), que leem essas colunas ao vivo — contrariando o princípio
    central do sistema ("tudo calculado ao vivo via view", `docs/01-arquitetura.md`).
  - Senha nunca passa por coluna própria — 100% GoTrue/bcrypt nativo do Supabase Auth.
  - **Gatilho futuro registrado:** se um dado genuinamente sensível for adicionado depois (conta
    bancária para pagamento de comissão, CPF de representante PJ individual), `pgcrypto` está
    disponível no Postgres gerenciado do Supabase (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) —
    melhor habilitar no momento de criar a coluna do que migrar dado já em cleartext depois.

---

## Etapa 5 — Corrigir `docs/02-banco-de-dados.md` (seção Segurança/RLS desatualizada)

A seção atual (linhas 57-61) diz: *"Leitura (SELECT) é pública em todas as tabelas — a v1 não tem
login."* Isso é falso desde a v2/v2.4. Reescrever refletindo o estado real **pós-verificação da
Etapa 2** (o que os scripts confirmaram no banco de produção, não o que a migration deveria ter
feito):

- Login obrigatório (Supabase Auth) para qualquer leitura — nenhuma tabela com policy sem `TO` ou
  `TO public`.
- Dimensões (`representantes`, `produtos`, `fornecedores`, `periodos`, `fornecedor_aliases`,
  `import_log`, `modulos`, `permissoes_role`) — liberado para qualquer usuário autenticado.
- Tabelas escopadas por representante (`vendas`, `clientes`, `metas`, `metas_representante`) — via
  `pode_ver_representante()` (`SECURITY DEFINER`).
- `profiles`/`permissoes_usuario`/`supervisor_representantes` — via `is_manager()`
  (`SECURITY DEFINER`, corrige a recursão da v2.2).
- Escrita: nenhuma policy de INSERT/UPDATE/DELETE para `authenticated`/`anon` em nenhuma tabela —
  desenho intencional, toda escrita via `supabaseAdmin` (service role) em Server Actions/rotas
  guardadas por `requirePermission`/`requireRole` (`src/lib/auth/permissions.ts`).
- Incluir a subseção "Criptografia" da Etapa 4.
- Referenciar `supabase_migration_v2.sql`/`v2_2.sql`/`v2_4.sql`, não só a v1.

---

## Etapa 6 — Fechar pendência em `docs/PENDENCIAS.md`

Adicionar uma entrada nova datada (30/08/2026) no **topo** do arquivo, no mesmo formato das
entradas anteriores (sem remover nada existente), contendo:

- Resultado do checklist da Etapa 1, item a item (feito / decidido não mudar e por quê).
- Resultado de `security_audit_rls_anon.mjs` (Etapa 2a) — confirmação de que as 8 tabelas do
  achado de 27/08 seguem corrigidas em produção.
- Resultado de `security_audit_scope_forgery.mjs` (Etapa 2b) — **fechando explicitamente o item 7**
  da lista de pendências de 27/08, referenciando os dois scripts como forma repetível de re-rodar a
  varredura a cada mudança futura de RLS.
- Resultado do `npm audit` (Etapa 3).
- Resumo da decisão de não implementar pgcrypto agora (detalhe completo fica em
  `02-banco-de-dados.md`).
- Item registrado como **fora de escopo, para depois do teste de aceitação**: auditoria/log de
  acesso a dado sensível (quem consultou/alterou comissão, permissões, metas) — só citado, sem
  desenho de solução, por pedido explícito do usuário em 29/08/2026.

---

## Arquivos a criar/editar

- `scripts/security_audit_rls_anon.mjs` (novo)
- `scripts/security_audit_scope_forgery.mjs` (novo)
- `docs/02-banco-de-dados.md` (editar — seção Segurança/RLS + nova subseção Criptografia)
- `docs/PENDENCIAS.md` (editar — nova entrada no topo)
- `.env.example` (adicionar os 6 nomes de variáveis de teste, sem valores)
- `supabase_migration_v2_4.sql` (só referência — reaplicar trecho específico se a Etapa 2 achar
  regressão; não criar v2.5 do zero)
