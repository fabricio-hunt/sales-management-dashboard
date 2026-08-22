import * as xlsx from 'xlsx';
import path from 'path';

const file = 'd:/OneDrive/Documentos/DevRelatorioDeVendas/NV-RELATORIO DE VENDAS 2026 - AGOSTO - EQUIPE 94.xlsx';
const workbook = xlsx.readFile(file, { cellDates: true });
const sheet = workbook.Sheets['DD PEDIDOS'];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log(rows[0]);
