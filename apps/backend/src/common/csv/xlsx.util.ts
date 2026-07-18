import ExcelJS from "exceljs";
import { type CsvColumn, resolveColumns } from "./csv.util";

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
