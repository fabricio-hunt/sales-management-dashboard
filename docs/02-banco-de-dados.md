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
- `is_positivacao` (int): flag `POSIT` vinda direto do ERP — mantida como está, nunca recalculada em v1 (ver
  `04-regras-de-negocio.md`).
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

Leitura (`SELECT`) é pública em todas as tabelas — a v1 não tem login. Escrita (`INSERT`/`UPDATE`/`DELETE`) não tem
policy pro role `anon`: toda escrita passa pela service role key, usada só server-side (Route Handlers e Server
Actions em `src/app/admin/actions.ts`), nunca no bundle do browser.
