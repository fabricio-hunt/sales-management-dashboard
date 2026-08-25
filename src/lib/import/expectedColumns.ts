// Única fonte de verdade para as colunas esperadas no export "DD PEDIDOS" do ERP.
// Usado pelo guardrail de validação (/api/admin/import) e pelo gerador de
// template (/api/download-template). Antes disso essa lista existia duplicada
// em 3 lugares (scripts/etl_processor.py, ambas as rotas) — mantenha só aqui.
export const EXPECTED_COLUMNS = [
  "Seq", "Data Documento", "Fornecedor", "Cond. Pagto", "Município", "UF",
  "Cliente", "Representante", "Nr Pedido", "Produto", "Região", "Área",
  "Setor", "Entidade", "Transação", "Supervisor", "Linha", "Data", "Ramo",
  "Embalagem", "Kit", "Código Produto", "Fantasia Cliente", "Fantasia Fornec",
  "Cod.Pessoa", "CodReferencia", "DescrReferencia", "CodMotivo", "Descr.Motivo",
  "TipoTabela", "Tipo Doc", "Codigo Kit", "Descrição Kit", "Grupo", "CPF\\CNPJ",
  "Nota Fiscal", "Devolução", "Desconto", "Compra", "Venda", "Qtde Saída",
  "Peso Bruto", "Peso Liq.", "Qtde Dev.", "Desconto Promocional",
  "Qtde Itens Ped", "Desp. Acessória", "VDA LIQ", "TT VDA LIQ", "PEDIDOS",
] as const;

// Colunas dos templates próprios do sistema (não vêm do ERP) — imports
// independentes de fornecedores/clientes/metas, aditivos (upsert), sem o
// delete-and-reinsert que só faz sentido pro DD PEDIDOS (vendas).
export const FORNECEDOR_COLUMNS = [
  "Nome Fantasia", "Aliases ERP (separados por ;)", "Ativo",
] as const;

export const CLIENTE_COLUMNS = [
  "Cod.Pessoa", "Razão Social", "Fantasia", "CNPJ", "Município", "UF",
  "Representante", "Status",
] as const;

export const META_COLUMNS = [
  "Mês", "Representante", "Fornecedor", "Meta Cx", "Meta Dia Cx", "Meta Fin",
  "Preço Médio", "Desafio Dist", "Premiação % Cx", "Premiação % Fin",
] as const;
