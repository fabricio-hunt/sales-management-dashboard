import * as xlsx from 'xlsx';
import fs from 'fs';

const file = 'd:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx';
const buffer = fs.readFileSync(file);
const workbook = xlsx.read(buffer, { cellDates: true, type: 'buffer' });

const sheetName = workbook.SheetNames.find(s => s.trim().toUpperCase() === "DD PEDIDOS") || workbook.SheetNames[0];
console.log("Sheet found:", sheetName);

const worksheet = workbook.Sheets[sheetName];
const rawJson = xlsx.utils.sheet_to_json(worksheet);

console.log("Total rows:", rawJson.length);
console.log("\n--- ALL KEYS from first row ---");
const firstRow = rawJson[0];
for (const key of Object.keys(firstRow)) {
  console.log(`  Key: "${key}" => Value: ${JSON.stringify(firstRow[key])}`);
}

console.log("\n--- ALL KEYS from row 100 ---");
const row100 = rawJson[100];
if (row100) {
  for (const key of Object.keys(row100)) {
    console.log(`  Key: "${key}" => Value: ${JSON.stringify(row100[key])}`);
  }
}
