import xlsx from 'xlsx';
import fs from 'fs';

const buffer = fs.readFileSync('d:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx');
const wb = xlsx.read(buffer, { cellDates: false, type: 'buffer' });

// Read the "DD PEDIDOS" sheet - this has the raw data with supplier names
const ws = wb.Sheets['DD PEDIDOS'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:A1');

// Find header row
let headerRow = 0;
for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
  const cell = ws[xlsx.utils.encode_cell({ r, c: 0 })];
  if (cell && String(cell.v).trim() === 'Seq') {
    headerRow = r;
    break;
  }
}

const newRange = { ...range, s: { ...range.s, r: headerRow } };
ws['!ref'] = xlsx.utils.encode_range(newRange);
const rows = xlsx.utils.sheet_to_json(ws);

// Build a map of Excel "Fornecedor" name -> product descriptions
const fornecedorMap = new Map();
rows.forEach(row => {
  const fornecedor = row['Fornecedor'];
  const produto = row['Produto'];
  if (!fornecedor || !produto) return;
  
  if (!fornecedorMap.has(fornecedor)) fornecedorMap.set(fornecedor, new Set());
  fornecedorMap.get(fornecedor).add(String(produto).substring(0, 50));
});

console.log('\n=== Fornecedores da planilha e seus produtos ===');
for (const [fornecedor, produtos] of [...fornecedorMap.entries()].sort()) {
  const amostra = [...produtos].slice(0, 3).join(' | ');
  console.log(`"${fornecedor}" => ${amostra}`);
}
