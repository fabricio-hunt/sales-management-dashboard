import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Expected columns for the Guardrails validation
    const EXPECTED_COLUMNS = [
      "Seq", "Data Documento", "Fornecedor", "Cond. Pagto", "Município", "UF",
      "Cliente", "Representante", "Nr Pedido", "Produto", "Região", "Área",
      "Setor", "Entidade", "Transação", "Supervisor", "Linha", "Data", "Ramo",
      "Embalagem", "Kit", "Código Produto", "Fantasia Cliente", "Fantasia Fornec",
      "Cod.Pessoa", "CodReferencia", "DescrReferencia", "CodMotivo", "Descr.Motivo",
      "TipoTabela", "Tipo Doc", "Codigo Kit", "Descrição Kit", "Grupo", "CPF\CNPJ",
      "Nota Fiscal", "Devolução", "Desconto", "Compra", "Venda", "Qtde Saída",
      "Peso Bruto", "Peso Liq.", "Qtde Dev.", "Desconto Promocional",
      "Qtde Itens Ped", "Desp. Acessória", "VDA LIQ", "TT VDA LIQ", "POSIT"
    ];

    // Create an empty worksheet with just the headers
    const worksheet = XLSX.utils.aoa_to_sheet([EXPECTED_COLUMNS]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DD PEDIDOS");

    // Write the workbook to a buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Template_Importacao_Vendas.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao gerar o template." },
      { status: 500 }
    );
  }
}
