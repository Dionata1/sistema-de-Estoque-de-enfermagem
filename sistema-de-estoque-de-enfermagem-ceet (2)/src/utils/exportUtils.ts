/**
 * Sistema de Estoque de Enfermagem CEET
 * Utilitários de Exportação de Dados e Relatórios (Excel, CSV, Print/PDF) - RN-037 / RF-010 / Cap 11
 */

import * as XLSX from 'xlsx';

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  fileName: string,
  sheetName = 'Relatório CEET'
): void {
  if (!data || !data.length) {
    alert('Não há dados para exportar.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  fileName: string
): void {
  if (!data || !data.length) {
    alert('Não há dados para exportar.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPrint(title: string, tableHtml: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=600');
  if (!printWindow) {
    alert('O navegador bloqueou a abertura da janela de impressão.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title} - CEET</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 24px; color: #1e293b; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #1e3a8a; }
        .header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: 600; color: #334155; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Centro Estadual de Educação Técnica Giuseppe Altoé (CEET)</h1>
        <p><strong>${title}</strong> &bull; Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      ${tableHtml}
      <div class="footer">
        Sistema Oficial de Estoque de Enfermagem CEET &bull; Todos os direitos reservados.
      </div>
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
