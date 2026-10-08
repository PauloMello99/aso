import { parseOverviewPeriod } from "./overview-period";
import { OverviewInvalidPeriodException } from "./exceptions/overview-invalid-period.exception";

describe("parseOverviewPeriod", () => {
  it("sem parâmetros retorna período vazio", () => {
    expect(parseOverviewPeriod(undefined, undefined)).toEqual({
      from: undefined,
      to: undefined,
    });
  });

  it("converte from/to ISO válidos em Date", () => {
    const period = parseOverviewPeriod(
      "2026-07-01T00:00:00.000Z",
      "2026-07-31T23:59:59.999Z",
    );
    expect(period.from).toEqual(new Date("2026-07-01T00:00:00.000Z"));
    expect(period.to).toEqual(new Date("2026-07-31T23:59:59.999Z"));
  });

  it("aceita from igual a to", () => {
    expect(() =>
      parseOverviewPeriod("2026-07-01T00:00:00Z", "2026-07-01T00:00:00Z"),
    ).not.toThrow();
  });

  it("data inválida lança OverviewInvalidPeriodException", () => {
    expect(() => parseOverviewPeriod("abc", undefined)).toThrow(
      OverviewInvalidPeriodException,
    );
    expect(() => parseOverviewPeriod(undefined, "31/07/2026x")).toThrow(
      OverviewInvalidPeriodException,
    );
  });

  it("from > to lança OverviewInvalidPeriodException", () => {
    expect(() =>
      parseOverviewPeriod("2026-08-01T00:00:00Z", "2026-07-01T00:00:00Z"),
    ).toThrow(OverviewInvalidPeriodException);
  });
});
