export function csvCell(value: unknown, delimiter = ","): string {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuote = /[",\n;]/.test(s) || s.includes(delimiter);
  if (needsQuote) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => unknown;
}

export function parseFields(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const arr = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

export function resolveColumns<T>(
  columns: CsvColumn<T>[],
  fields?: string[],
): CsvColumn<T>[] {
  const selected =
    fields && fields.length
      ? columns.filter((c) => fields.includes(c.key))
      : columns;
  return selected.length ? selected : columns;
}

export type ExportFormat = "csv" | "xlsx";

export function resolveExportFormat(raw?: string): ExportFormat {
  return raw === "xlsx" ? "xlsx" : "csv";
}

export type CsvDelimiter = "comma" | "semicolon" | "tab";

export function resolveCsvDelimiter(raw?: string): CsvDelimiter {
  return raw === "semicolon" || raw === "tab" ? raw : "comma";
}

export function csvDelimiterChar(delimiter: CsvDelimiter): string {
  switch (delimiter) {
    case "semicolon":
      return ";";
    case "tab":
      return "\t";
    default:
      return ",";
  }
}

export function buildCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  fields?: string[],
  delimiterChar = ",",
): string {
  const cols = resolveColumns(columns, fields);
  const header = cols.map((c) => c.header).join(delimiterChar);
  const lines = rows.map((r) =>
    cols.map((c) => csvCell(c.value(r), delimiterChar)).join(delimiterChar),
  );
  const bom = String.fromCharCode(0xfeff);
  return bom + [header, ...lines].join("\r\n");
}

export function csvDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

export function csvMoneyCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
