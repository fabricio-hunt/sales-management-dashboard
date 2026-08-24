import xlsx from 'xlsx';
import fs from 'fs';

const buffer = fs.readFileSync('d:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx');
const wb = xlsx.read(buffer, { cellDates: false, type: 'buffer' });

// Read the "Equipe" sheet to find supplier goals
const ws = wb.Sheets['Equipe'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:A1');

console.log('Equipe sheet range:', ws['!ref']);
console.log('\n--- First 60 rows ---');
for (let r = range.s.r; r <= Math.min(range.s.r + 60, range.e.r); r++) {
  const row = [];
  for (let c = range.s.c; c <= Math.min(range.s.c + 20, range.e.c); c++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    row.push(cell ? String(cell.v ?? '').substring(0, 25) : '');
  }
  if (row.some(v => v.trim())) {
    console.log(`R${r}:`, row.join(' | '));
  }
}
