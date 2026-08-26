import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { EXPECTED_COLUMNS, FORNECEDOR_COLUMNS, CLIENTE_COLUMNS, META_COLUMNS, META_REPRESENTANTE_COLUMNS } from "@/lib/import/expectedColumns";

const TEMPLATES = {
  vendas: { columns: EXPECTED_COLUMNS, sheet: "DD PEDIDOS", filename: "Template_Importacao_Vendas.xlsx" },
  fornecedores: { columns: FORNECEDOR_COLUMNS, sheet: "Fornecedores", filename: "Template_Importacao_Fornecedores.xlsx" },
  clientes: { columns: CLIENTE_COLUMNS, sheet: "Clientes", filename: "Template_Importacao_Clientes.xlsx" },
  metas: { columns: META_COLUMNS, sheet: "Metas", filename: "Template_Importacao_Metas.xlsx" },
  metas_representante: { columns: META_REPRESENTANTE_COLUMNS, sheet: "Objetivos", filename: "Template_Importacao_Objetivos.xlsx" },
} as const;

export async function GET(request: NextRequest) {
  try {
    const tipoParam = request.nextUrl.searchParams.get("tipo") ?? "vendas";
    const tipo = (tipoParam in TEMPLATES ? tipoParam : "vendas") as keyof typeof TEMPLATES;
    const template = TEMPLATES[tipo];

    const worksheet = XLSX.utils.aoa_to_sheet([[...template.columns]]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, template.sheet);

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${template.filename}"`,
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
