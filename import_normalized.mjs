import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  // Find the header row
  let headerRow = 0;
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r, c: 0 })];
    if (cell && String(cell.v).trim() === 'Seq') {
      headerRow = r;
      break;
    }
  }

  const newRange = { ...range, s: { ...range.s, r: headerRow } };
  worksheet['!ref'] = xlsx.utils.encode_range(newRange);

  const rawJson = xlsx.utils.sheet_to_json(worksheet);
  console.log(`Found ${rawJson.length} records.`);

  const representantesMap = new Map();
  const clientesMap = new Map();
  const produtosMap = new Map();
  const vendasData = [];

  rawJson.forEach(row => {
    // Representante
    let repNomeStr = row["Representante"] || "";
    let repId = "94"; // fallback
    let repNome = repNomeStr;
    const repMatch = String(repNomeStr).match(/(\d+)\s*-\s*(.*)/);
    if (repMatch) {
       repId = repMatch[1];
       repNome = repMatch[2];
    }
    if (!representantesMap.has(repId)) {
        representantesMap.set(repId, { id: repId, nome: repNome });
    }

    // Cliente
    let cliIdStr = row["Cód. Pessoa"] || row["Cod. Pessoa"] || row["Cliente"] || "";
    let cliId = String(cliIdStr).split("-")[0].trim() || Math.random().toString();
    let razao_social = row["Cliente"] || "";
    if (razao_social.includes("-")) {
       razao_social = razao_social.substring(razao_social.indexOf("-")+1).trim();
    }
    if (!clientesMap.has(cliId)) {
        clientesMap.set(cliId, {
            id: cliId,
            razao_social: razao_social,
            fantasia: row["Fantasia"] || null,
            cnpj: row["CPF\\CNPJ"]?.toString() || null,
            municipio: row["Município"] || null,
            uf: row["UF"] || null,
        });
    }

    // Produto
    let prodIdStr = row["Cód. Produto"] || row["Produto"] || "";
    let prodId = String(prodIdStr).split("-")[0].trim() || Math.random().toString();
    let prodDesc = row["Produto"] || "";
    if (prodDesc.includes("-")) {
       prodDesc = prodDesc.substring(prodDesc.indexOf("-")+1).trim();
    }
    if (!produtosMap.has(prodId)) {
        produtosMap.set(prodId, {
            id: prodId,
            descricao: prodDesc,
            fornecedor_nome: row["Fornecedor"] || null,
        });
    }

    // Venda
    let dataDocumento = null;
    if (row["Data Documento"]) {
      dataDocumento = new Date(row["Data Documento"]);
      if (isNaN(dataDocumento.getTime())) {
        dataDocumento = null;
      }
    }

    let isPositivacao = row["POSIT"] !== undefined ? parseInt(row["POSIT"]) : 1;
    if (isNaN(isPositivacao)) isPositivacao = 1;

    vendasData.push({
      pedido_nr: row["Nota Fiscal"]?.toString() || null,
      data_venda: dataDocumento ? dataDocumento.toISOString().split("T")[0] : null,
      cliente_id: cliId,
      representante_id: repId,
      produto_id: prodId,
      venda_liq: parseFloat(row["VDA LIQ"]) || 0,
      venda_bruta: parseFloat(row["Venda Bruta"]) || parseFloat(row["VDA LIQ"]) || 0,
      devolucao: parseFloat(row["Devolução"]) || parseFloat(row["Devolução / Estorno"]) || 0,
      desconto: parseFloat(row["Desconto"]) || 0,
      qtde: parseFloat(row["Qtde Saída"]) || 0,
      peso_bruto: parseFloat(row["Peso Bruto"]) || 0,
      peso_liq: parseFloat(row["Peso Líquido"]) || parseFloat(row["Peso Liq"]) || 0,
      is_positivacao: isPositivacao
    });
  });

  console.log(`Unique Representantes: ${representantesMap.size}`);
  console.log(`Unique Clientes: ${clientesMap.size}`);
  console.log(`Unique Produtos: ${produtosMap.size}`);
  console.log(`Total Vendas: ${vendasData.length}`);

  // Insert Arrays
  const repArray = Array.from(representantesMap.values());
  const cliArray = Array.from(clientesMap.values());
  const prodArray = Array.from(produtosMap.values());

  // UPSERT REPRESENTANTES
  console.log("Upserting representantes...");
  for (let i = 0; i < repArray.length; i += 1000) {
      const chunk = repArray.slice(i, i + 1000);
      const { error } = await supabase.from('representantes').upsert(chunk);
      if (error) console.error("Error upserting representantes:", error);
  }

  // UPSERT CLIENTES
  console.log("Upserting clientes...");
  for (let i = 0; i < cliArray.length; i += 1000) {
      const chunk = cliArray.slice(i, i + 1000);
      const { error } = await supabase.from('clientes').upsert(chunk);
      if (error) console.error("Error upserting clientes:", error);
  }

  // UPSERT PRODUTOS
  console.log("Upserting produtos...");
  for (let i = 0; i < prodArray.length; i += 1000) {
      const chunk = prodArray.slice(i, i + 1000);
      const { error } = await supabase.from('produtos').upsert(chunk);
      if (error) console.error("Error upserting produtos:", error);
  }

  // INSERT VENDAS (Delete old ones first to avoid duplicates)
  console.log("Cleaning old vendas...");
  await supabase.from('vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Inserting vendas...");
  for (let i = 0; i < vendasData.length; i += 1000) {
      const chunk = vendasData.slice(i, i + 1000);
      // Filter out invalid dates for Postgres DATE column
      const validChunk = chunk.filter(c => c.data_venda !== null);
      const { error } = await supabase.from('vendas').insert(validChunk);
      if (error) {
        console.error("Error inserting vendas chunk:", error);
      }
  }

  console.log("Import Complete!");
}

runImport().catch(console.error);
