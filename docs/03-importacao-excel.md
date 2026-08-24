# Fluxo de Importação (Excel -> Supabase)

Para evitar que a equipe de vendas altere seu fluxo diário, construímos um mecanismo que converte diretamente a extração do ERP (via Excel) para o banco de dados.

## Como funciona?
1. **Upload:** O usuário sobe a planilha (ex: base_vendas.xlsx) na área de Admin (\/admin/importar\).
2. **Parsing:** O script mapeia os cabeçalhos das colunas (mesmo que venham com sujeira do ERP).
3. **Mapeamento de Nomes:** Como ERPs frequentemente salvam o Razão Social de formas distintas, o sistema unifica nomes semelhantes (ex: \ALGO MAIS TEMPEROS EIRELI\ se torna \Chef Clay Molhos\).
4. **Inserção em Lote (Batch Insert):** O código particiona as dezenas de milhares de registros e insere em lotes (ex: 1000 por vez) no Supabase, impedindo travamentos e garantindo que tudo chegue ao banco rapidamente.
