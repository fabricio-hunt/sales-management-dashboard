# Banco de Dados (Supabase)

Nosso banco é gerenciado pelo **Supabase**, utilizando o robusto PostgreSQL. Ele foi desenhado para comportar milhões de linhas de histórico de vendas de forma performática.

## Tabela: \endas\
Tabela principal que armazena os registros faturados.
- \enda_liq\ (numeric): Valor líquido da venda.
- \qtde\ (numeric): Volume em caixas (ou unidades).
- \data_venda\ (date): Data base da transação.
- \is_positivacao\ (int): Flag que indica se aquela venda conta como positivação (ex: novos clientes).
- \cliente_id\ (uuid): Referência ao cliente que comprou.
- \produto_id\ (uuid): Referência ao produto/fornecedor.

## Tabela: \produtos\
Armazena a relação de itens e seus fornecedores, importante para a Curva ABC e a consolidação de metas.
- \ornecedor_nome\ (string): O fabricante original do produto.
