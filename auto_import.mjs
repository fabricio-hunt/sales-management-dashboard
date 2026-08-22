import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runImport() {
  console.log("Reading file...");
  const file = 'd:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx';
  const buffer = fs.readFileSync(file);
  const workbook = xlsx.read(buffer, { cellDates: true, type: 'buffer' });
  
  const sheetName = workbook.SheetNames.find(s => s.trim().toUpperCase() === "DD PEDIDOS") || workbook.SheetNames[0];
  console.log("Using sheet:", sheetName);
  const worksheet = workbook.Sheets[sheetName];

  // The sheet has a title row + blank row before the real headers.
  // We need to find the actual header row containing "Seq", "Data Documento", etc.
  // xlsx range format: { s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } }
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  // Find the header row by scanning for "Seq" in column A
  let headerRow = 0;
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r, c: 0 })];
    if (cell && String(cell.v).trim() === 'Seq') {
      headerRow = r;
      break;
    }
  }
  console.log("Header row index:", headerRow);

  // Set the range to start from the header row
  const newRange = { ...range, s: { ...range.s, r: headerRow } };
  worksheet['!ref'] = xlsx.utils.encode_range(newRange);

  const rawJson = xlsx.utils.sheet_to_json(worksheet);
  console.log(`Found ${rawJson.length} records.`);

  // Debug: print first row keys
  if (rawJson.length > 0) {
    console.log("First row keys:", Object.keys(rawJson[0]));
    console.log("First row sample:", JSON.stringify(rawJson[0], null, 2));
  }

  // Map to database schema
  const mappedData = rawJson.map(row => {
    let dataDocumento = null;
    if (row["Data Documento"]) {
      dataDocumento = new Date(row["Data Documento"]);
      if (isNaN(dataDocumento.getTime())) {
        dataDocumento = null;
      }
    }

    return {
      data_documento: dataDocumento ? dataDocumento.toISOString() : null,
      nota_fiscal: row["Nota Fiscal"]?.toString() || null,
      cliente_nome: row["Cliente"] || null,
      cliente_cnpj: row["CPF\\CNPJ"]?.toString() || null,
      municipio: row["Município"] || null,
      uf: row["UF"] || null,
      representante: row["Representante"] || null,
      produto_nome: row["Produto"] || null,
      fornecedor_nome: row["Fornecedor"] || null,
      valor_venda_liquida: parseFloat(row["VDA LIQ"]) || 0,
      valor_compra: parseFloat(row["Compra"]) || 0,
      qtde: parseFloat(row["Qtde Saída"]) || 0,
      desconto: parseFloat(row["Desconto"]) || 0
    };
  });

  // Debug: print first mapped row
  console.log("\nFirst mapped row:", JSON.stringify(mappedData[0], null, 2));

  console.log("\nDeleting old records...");
  await supabase.from("pedidos").delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Inserting new records...");
  const chunkSize = 1000;
  for (let i = 0; i < mappedData.length; i += chunkSize) {
    const chunk = mappedData.slice(i, i + chunkSize);
    const { error } = await supabase.from("pedidos").insert(chunk);
    if (error) {
      console.error(`Error inserting chunk ${i}:`, error);
      return;
    }
    console.log(`Inserted ${Math.min(i + chunkSize, mappedData.length)} / ${mappedData.length}`);
  }
  console.log("Done!");
}

runImport().catch(console.error);
