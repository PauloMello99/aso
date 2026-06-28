/**
 * Utilitários de geração de CSV no backend (RPT-2).
 *
 * O export por module reusa o respectivo list use-case (preservando filtros e
 * o scoping por funcionário) e serializa as colunas escolhidas via `?fields=`.
 */

/** Escapa uma célula: aspas duplicadas e envolve quando há separador/quebra. */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
 * Monta o CSV a partir das linhas e da definição de colunas.
 * `fields` seleciona/ordena pelo conjunto canônico de colunas (ordem de definição).
 * Prefixa BOM (U+FEFF) para o Excel reconhecer UTF-8.
 */
export function buildCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  fields?: string[],
): string {
  const selected =
    fields && fields.length
      ? columns.filter((c) => fields.includes(c.key))
      : columns;
  // Fallback: se `fields` não casar nenhuma coluna, exporta todas.
  const cols = selected.length ? selected : columns;
  const header = cols.map((c) => c.header).join(",");
  const lines = rows.map((r) =>
    cols.map((c) => csvCell(c.value(r))).join(","),
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
