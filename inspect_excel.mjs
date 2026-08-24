import xlsx from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const buffer = fs.readFileSync('d:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx');
const wb = xlsx.read(buffer, { cellDates: true, type: 'buffer' });
console.log('Sheets:', wb.SheetNames);

// Try to find the "EQUIPE" sheet with goals
for (const sheetName of wb.SheetNames) {
  console.log('\n=== Sheet:', sheetName, '===');
  const ws = wb.Sheets[sheetName];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:A1');
  
  // Print first 30 rows of each sheet to see structure
  for (let r = range.s.r; r <= Math.min(range.s.r + 30, range.e.r); r++) {
    const row = [];
    for (let c = range.s.c; c <= Math.min(range.s.c + 15, range.e.c); c++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v ?? '').substring(0, 20) : '');
    }
    if (row.some(v => v.trim())) {
      console.log(`Row ${r}:`, row.join(' | '));
    }
  }
}
