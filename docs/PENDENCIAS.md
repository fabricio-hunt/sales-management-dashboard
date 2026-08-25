# Pendências & Dúvidas — Sessão 24/08/2026

Documento criado para registrar todos os pontos abertos antes de continuar o desenvolvimento.

> **Atualização 25/08/2026:** rodada de planejamento avançado + implementação da fundação da v1 (schema, import,
> `/equipe`, telas analíticas/rankings/distribuição, admin de metas/fornecedores). A maioria dos itens abaixo foi
> resolvida com decisão própria (documentada inline), já que o cliente ainda não tinha dado feedback. Ver
> `supabase_migration_v1.sql` e `docs/01..05-*.md` atualizados pro estado real do sistema.

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
