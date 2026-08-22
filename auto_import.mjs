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
  const worksheet = workbook.Sheets[sheetName];
  const rawJson = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Found ${rawJson.length} records. Mapping data...`);
  
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
      valor_venda_liquida: parseFloat(row["VDA LIQ"] ?? row["Venda Liq."] ?? row["TT VDA LIQ"]) || 0,
      valor_compra: parseFloat(row["Compra"]) || 0,
      qtde: parseFloat(row["Qtde Saída"] ?? row["PEDIDOS"]) || 0,
      desconto: parseFloat(row["Desconto"] ?? row["Desconto Promocional"]) || 0
    };
  });

  console.log("Deleting old empty records...");
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
