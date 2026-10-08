import { OverviewInvalidPeriodException } from "./exceptions/overview-invalid-period.exception";

export interface OverviewPeriod {
  from?: Date;
  to?: Date;
}

function parseBound(label: "from" | "to", raw: string | undefined): Date | undefined {
  if (raw === undefined || raw === "") return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new OverviewInvalidPeriodException(
      `Parâmetro "${label}" não é uma data ISO válida.`,
    );
  }
  return date;
}

export function parseOverviewPeriod(
  rawFrom: string | undefined,
  rawTo: string | undefined,
): OverviewPeriod {
  const from = parseBound("from", rawFrom);
  const to = parseBound("to", rawTo);
  if (from && to && from.getTime() > to.getTime()) {
    throw new OverviewInvalidPeriodException(
      'O parâmetro "from" deve ser anterior ou igual a "to".',
    );
  }
  return { from, to };
}
