import ExcelJS from 'exceljs';

export interface ColumnaExport {
  header: string;
  key: string;
  width?: number;
}

export interface HojaExport {
  nombre: string;
  columnas: ColumnaExport[];
  filas: Record<string, unknown>[];
}

const COLOR_HEADER = 'FF0072BC';

export async function exportarAExcel(nombreArchivo: string, hojas: HojaExport[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TaxiAsiste';
  wb.created = new Date();

  for (const { nombre, columnas, filas } of hojas) {
    const ws = wb.addWorksheet(nombre.slice(0, 31));
    ws.columns = columnas.map(c => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    filas.forEach(fila => {
      const row = ws.addRow(fila);
      row.eachCell(cell => {
        cell.font = { name: 'Arial', size: 11 };
        cell.alignment = { vertical: 'middle' };
      });
    });

    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
