# Fluxo de Importação (Excel -> Supabase)

Pra não mudar o fluxo diário da equipe de vendas, o sistema converte direto a extração do ERP (aba `DD PEDIDOS`
do Excel) pro banco.

## Como funciona

1. **Upload:** o usuário sobe a planilha em `/admin/importar`.
2. **Guardrails:** `POST /api/admin/import` valida que todas as ~48 colunas esperadas existem (lista única em
   `src/lib/import/expectedColumns.ts` — usada também pelo template em `/api/download-template`). Faltando
   coluna, a importação é bloqueada com a lista do que falta.
3. **Mapeamento de fornecedor:** a razão social do ERP é resolvida pra um nome fantasia via `fornecedor_aliases`.
   Razão social nova (sem alias) gera um fornecedor `[Revisar] <razão social>` automaticamente — pra não perder a
   venda — e cai numa fila de revisão em `/admin/fornecedores`, onde dá pra renomear e recadastrar o alias correto
   sem precisar de deploy.
4. **Confirmação:** antes de gravar, a rota devolve o período detectado (data mínima/máxima do arquivo) e pede
   confirmação explícita (`confirm=true`) — a tela mostra "isso vai substituir N vendas do período X" antes de
   prosseguir.
5. **Upsert de dimensões:** `representantes` → `clientes` (nunca sobrescreve `representante_id`/`status` já
   setados manualmente) → `produtos` (com `fornecedor_id` resolvido).
6. **Idempotência — delete-and-reinsert por período:** a rota apaga (`apagar_vendas_periodo`, RPC) as vendas do
   intervalo de datas do arquivo pros representantes envolvidos, e insere tudo de novo em lotes de 500. Reimportar
   o mesmo `DD PEDIDOS` do mês não duplica nada.

## Pipeline único (histórico)

Existiam dois caminhos concorrentes antes desta versão: upload client-side (inserindo direto do navegador) e um
endpoint que rodava um script Python (`pandas`) via `child_process`. O segundo não roda em ambiente serverless
(Vercel) — foi removido. `/api/admin/import`, em Node/TS, é o único caminho oficial agora.
