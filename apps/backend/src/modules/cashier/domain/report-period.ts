import { MemberReportInvalidPeriodException } from "./exceptions/member-report-invalid-period.exception";

export const MAX_REPORT_WINDOW_DAYS = 366;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReportPeriod {
  /** YYYY-MM-DD original (para nome de arquivo e cabecalho). */
  fromDate: string;
  toDate: string;
  /** Inicio do dia `fromDate` em America/Sao_Paulo (UTC-03:00, sem DST). */
  from: Date;
  /** Ultimo milissegundo do dia `toDate` em America/Sao_Paulo. */
  to: Date;
}

function utcMs(value: string, label: string): number {
  const match = ISO_DATE.exec(value);
  if (!match) {
    throw new MemberReportInvalidPeriodException(
      `"${label}" deve estar no formato AAAA-MM-DD.`,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new MemberReportInvalidPeriodException(
      `"${label}" não é uma data válida: ${value}.`,
    );
  }
  return ms;
}

// Params `unknown`: vem direto da query string (ausente ou repetido chega como
// undefined/array), entao a checagem de tipo precisa acontecer aqui.
export function parseReportPeriod(
  fromDate: unknown,
  toDate: unknown,
): ReportPeriod {
  if (typeof fromDate !== "string") {
    throw new MemberReportInvalidPeriodException(
      "Informe a data inicial (from) no formato AAAA-MM-DD.",
    );
  }
  if (typeof toDate !== "string") {
    throw new MemberReportInvalidPeriodException(
      "Informe a data final (to) no formato AAAA-MM-DD.",
    );
  }
  const fromMs = utcMs(fromDate, "from");
  const toMs = utcMs(toDate, "to");
  if (fromMs > toMs) {
    throw new MemberReportInvalidPeriodException(
      '"from" não pode ser posterior a "to".',
    );
  }
  const days = Math.round((toMs - fromMs) / DAY_MS) + 1;
  if (days > MAX_REPORT_WINDOW_DAYS) {
    throw new MemberReportInvalidPeriodException(
      `O período máximo do relatório é de ${MAX_REPORT_WINDOW_DAYS} dias.`,
    );
  }
  return {
    fromDate,
    toDate,
    from: new Date(`${fromDate}T00:00:00.000-03:00`),
    to: new Date(`${toDate}T23:59:59.999-03:00`),
  };
}
