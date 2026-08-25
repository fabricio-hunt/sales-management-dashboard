import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { EXPECTED_COLUMNS } from "@/lib/import/expectedColumns";

export async function GET() {
  try {
    // Create an empty worksheet with just the headers
    const worksheet = XLSX.utils.aoa_to_sheet([[...EXPECTED_COLUMNS]]);
    
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
