/**
 * Utilitários de geração de CSV/XLSX no backend (RPT-2, M8/A5).
 *
 * O export por module reusa o respectivo list use-case (preservando filtros e
 * o scoping por funcionário) e serializa as colunas escolhidas via `?fields=`.
 */

/** Escapa uma célula: aspas duplicadas e envolve quando há separador/quebra. */
export function csvCell(value: unknown, delimiter = ","): string {
  const s = value === null || value === undefined ? "" : String(value);
  const needsQuote = /[",\n;]/.test(s) || s.includes(delimiter);
  if (needsQuote) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CsvColumn<T> {
  /** Chave estável usada no seletor de campos (`?fields=`). */
  key: string;
  /** Cabeçalho legível na primeira linha do CSV. */
  header: string;
  /** Extrai/serializa o valor da linha. */
  value: (row: T) => unknown;
}

/** Converte `?fields=a,b,c` numa lista de chaves (ou undefined = todas). */
export function parseFields(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const arr = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

/**
 * Resolve o subconjunto/ordem de colunas visíveis a partir de `?fields=`.
 * Compartilhado entre `buildCsv` e `buildXlsx`. Fallback: se `fields` não
 * casar nenhuma coluna, exporta todas.
 */
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

/** Formato de exportação suportado pelos endpoints `?format=`. */
export type ExportFormat = "csv" | "xlsx";

/** Normaliza `?format=`: qualquer valor diferente de `"xlsx"` vira `"csv"`. */
export function resolveExportFormat(raw?: string): ExportFormat {
  return raw === "xlsx" ? "xlsx" : "csv";
}

/** Delimitador de CSV suportado pelos endpoints `?delimiter=`. */
export type CsvDelimiter = "comma" | "semicolon" | "tab";

/** Normaliza `?delimiter=`: valor ausente/desconhecido vira `"comma"`. */
export function resolveCsvDelimiter(raw?: string): CsvDelimiter {
  return raw === "semicolon" || raw === "tab" ? raw : "comma";
}

/** Converte o delimitador nomeado no caractere real usado no `.join()`. */
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

/**
 * Monta o CSV a partir das linhas e da definição de colunas.
 * `fields` seleciona/ordena pelo conjunto canônico de colunas (ordem de definição).
 * Prefixa BOM (U+FEFF) para o Excel reconhecer UTF-8.
 */
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
  // BOM (U+FEFF) para o Excel reconhecer UTF-8.
  const bom = String.fromCharCode(0xfeff);
  return bom + [header, ...lines].join("\r\n");
}

/** Formata uma data como dd/MM/yyyy (vazio quando ausente). */
export function csvDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

/** Formata centavos como reais com vírgula decimal: 123456 → "1234,56". */
export function csvMoneyCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
