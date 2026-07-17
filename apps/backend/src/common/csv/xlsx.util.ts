/**
 * Utilitário de geração de XLSX no backend (M8/A5).
 *
 * Reusa a mesma `CsvColumn<T>[]` e a mesma seleção de colunas via `?fields=`
 * que `buildCsv` já usa (ver `resolveColumns` em `./csv.util`).
 */
import ExcelJS from "exceljs";
import { type CsvColumn, resolveColumns } from "./csv.util";

/** Monta um .xlsx (Buffer) a partir das linhas e da definição de colunas. */
export async function buildXlsx<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  fields?: string[],
): Promise<Buffer> {
  const cols = resolveColumns(columns, fields);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");
  sheet.columns = cols.map((c) => ({ header: c.header, key: c.key }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const c of cols) {
      values[c.key] = c.value(row);
    }
    sheet.addRow(values);
  }

  // Largura automática básica: maior entre header e conteúdo, com teto.
  sheet.columns.forEach((column) => {
    let maxLength = column.header ? String(column.header).length : 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = len;
    });
    column.width = Math.min(maxLength + 2, 60);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
