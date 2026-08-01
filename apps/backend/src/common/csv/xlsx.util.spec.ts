import ExcelJS from "exceljs";
import { buildXlsx } from "./xlsx.util";
import type { CsvColumn } from "./csv.util";

interface Row {
  name: string;
  amount: number;
  createdAt: Date;
}

const COLUMNS: CsvColumn<Row>[] = [
  { key: "name", header: "Nome", value: (r) => r.name },
  { key: "amount", header: "Valor", value: (r) => r.amount },
  { key: "createdAt", header: "Criado em", value: (r) => r.createdAt },
];

const ROWS: Row[] = [
  { name: "Ana", amount: 100, createdAt: new Date("2026-01-15T00:00:00Z") },
  { name: "Bruno", amount: 250, createdAt: new Date("2026-02-20T00:00:00Z") },
];

describe("buildXlsx", () => {
  it("gera um buffer .xlsx válido (round-trip via ExcelJS)", async () => {
    const buffer = await buildXlsx(ROWS, COLUMNS);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeDefined();

    const headerRow = sheet!.getRow(1).values as unknown[];
    expect(headerRow.slice(1)).toEqual(["Nome", "Valor", "Criado em"]);

    const firstDataRow = sheet!.getRow(2).values as unknown[];
    expect(firstDataRow[1]).toBe("Ana");
    expect(firstDataRow[2]).toBe(100);
  });

  it("respeita `fields` para selecionar/ordenar colunas", async () => {
    const buffer = await buildXlsx(ROWS, COLUMNS, ["amount"]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const headerRow = sheet!.getRow(1).values as unknown[];
    expect(headerRow.slice(1)).toEqual(["Valor"]);
  });
});
