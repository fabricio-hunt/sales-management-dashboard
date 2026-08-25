# Fluxo de Importação (Excel -> Supabase)

`/admin/importar` é um hub com 4 importações independentes — cada uma pode ser usada sozinha, sem depender
das outras. Todas rodam em Node/TS (`runtime = "nodejs"`), com a service role key, e registram um histórico
em `import_log` (visível na própria tela, seção "Últimas importações").

| Import | Rota | Chave natural | Estratégia |
|---|---|---|---|
| Vendas (`DD PEDIDOS`) | `POST /api/admin/import/vendas` | nenhuma confiável | delete-and-reinsert por período |
| Fornecedores | `POST /api/admin/import/fornecedores` | `nome_fantasia` | upsert aditivo |
| Clientes | `POST /api/admin/import/clientes` | `id` (Cod.Pessoa) | upsert aditivo |
| Metas | `POST /api/admin/import/metas` | `mes + representante_id + fornecedor_id` | upsert aditivo |

Guardrails de coluna (uma lista por tipo em `src/lib/import/expectedColumns.ts`) e templates
(`/api/download-template?tipo=<vendas|fornecedores|clientes|metas>`) seguem o mesmo padrão nos 4.

## Vendas (`DD PEDIDOS`) — a única importação destrutiva

1. **Mapeamento de fornecedor:** a razão social do ERP é resolvida pra um nome fantasia via `fornecedor_aliases`.
   Razão social nova (sem alias) gera um fornecedor `[Revisar] <razão social>` automaticamente — pra não perder a
   venda — e aparece tanto no resultado do import quanto na fila de revisão em `/admin/fornecedores`.
2. **Confirmação:** antes de gravar, a rota devolve o período detectado (data mínima/máxima do arquivo) e pede
   confirmação explícita (`confirm=true`) — a tela mostra "isso vai substituir N vendas do período X" antes de
   prosseguir. É a única das 4 importações que precisa disso, porque é a única que apaga dado existente.
3. **Upsert de dimensões:** `representantes` → `clientes` (nunca sobrescreve `representante_id`/`status` já
   setados manualmente) → `produtos` (com `fornecedor_id` resolvido).
4. **Idempotência — delete-and-reinsert por período:** a rota apaga (`apagar_vendas_periodo`, RPC) as vendas do
   intervalo de datas do arquivo pros representantes envolvidos, e insere tudo de novo em lotes de 500. Reimportar
   o mesmo `DD PEDIDOS` do mês não duplica nada — inclusive quando um insert falha no meio do lote (rede caiu,
   etc.): a mensagem de erro orienta reenviar o mesmo arquivo, que corrige o período sozinho.
5. **Linhas ignoradas:** linhas sem cliente/produto/data válida não entram em `vendas`, mas agora são contadas e
   reportadas (`linhasIgnoradas` na resposta e em `import_log.linhas_ignoradas`), em vez de somem silenciosamente.

## Fornecedores, Clientes, Metas — importações aditivas

As outras três têm chave natural real, então usam **upsert**, nunca delete-and-reinsert — o cenário de negócio
é sempre "atualizar cadastro", nunca "substituir tudo". Isso as torna não-destrutivas por padrão: o pior caso de
um arquivo errado é sobrescrever um campo com valor errado, nunca apagar uma linha que não estava no arquivo.
Por isso nenhuma das três pede confirmação prévia — só mostram o resultado (`N criados, M atualizados`) depois
de rodar.

- **Fornecedores:** aceita uma coluna opcional `Aliases ERP (separados por ;)` pra já popular
  `fornecedor_aliases` junto — útil quando o cliente manda a lista de fornecedores com os nomes como aparecem
  no ERP, sem precisar subir vendas antes.
- **Clientes:** por padrão nunca sobrescreve `representante_id`/`status` já atribuídos manualmente (mesma regra
  do import de vendas). Um checkbox "sobrescrever atribuições manuais" na tela liga um resync completo quando
  o cliente realmente quer isso.
- **Metas:** faz upsert por `mes + representante_id + fornecedor_id`; não apaga metas do mês que não estejam no
  arquivo (evita que um arquivo parcial zere fornecedores esquecidos). O fornecedor é resolvido pelo nome
  fantasia (precisa já estar cadastrado) e o mês precisa já existir em `/configuracoes` — linhas que não batem
  são ignoradas e contadas, não travam o restante do import.

## Pipeline único (histórico)

Existiam dois caminhos concorrentes antes da v1: upload client-side (inserindo direto do navegador) e um
endpoint que rodava um script Python (`pandas`) via `child_process` (não roda em ambiente serverless/Vercel) —
ambos removidos. Depois, a v1 unificou tudo num único endpoint (`/api/admin/import`) só pra vendas. Esta versão
(v1.1) generaliza o padrão pras outras 3 entidades, cada uma com sua própria rota (`src/app/api/admin/import/*`)
— lógica de vendas isolada num arquivo próprio, pra não misturar o delete transacional dela com o upsert simples
das outras.
