import { parseReportPeriod } from "./report-period";
import { MemberReportInvalidPeriodException } from "./exceptions/member-report-invalid-period.exception";

describe("parseReportPeriod", () => {
  it("converte o intervalo para o dia inteiro em America/Sao_Paulo (UTC-03:00)", () => {
    const period = parseReportPeriod("2026-09-01", "2026-09-30");

    expect(period.from.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-01T02:59:59.999Z");
    expect(period.fromDate).toBe("2026-09-01");
    expect(period.toDate).toBe("2026-09-30");
  });

  it("aceita from == to (um dia)", () => {
    expect(() => parseReportPeriod("2026-09-10", "2026-09-10")).not.toThrow();
  });

  it("aceita exatamente 366 dias (inclusivo)", () => {
    expect(() => parseReportPeriod("2024-01-01", "2024-12-31")).not.toThrow();
  });

  it("rejeita janela de 367 dias", () => {
    expect(() => parseReportPeriod("2024-01-01", "2025-01-01")).toThrow(
      MemberReportInvalidPeriodException,
    );
  });

  it("rejeita from posterior a to", () => {
    expect(() => parseReportPeriod("2026-09-10", "2026-09-09")).toThrow(
      MemberReportInvalidPeriodException,
    );
  });

  it("rejeita data inexistente (30/02) e formato inválido", () => {
    expect(() => parseReportPeriod("2026-02-30", "2026-03-10")).toThrow(
      MemberReportInvalidPeriodException,
    );
    expect(() => parseReportPeriod("2026-13-01", "2026-13-02")).toThrow(
      MemberReportInvalidPeriodException,
    );
    expect(() => parseReportPeriod("01/09/2026", "2026-09-10")).toThrow(
      MemberReportInvalidPeriodException,
    );
  });

  it("rejeita from/to ausentes ou repetidos com mensagem pt-BR", () => {
    expect(() => parseReportPeriod(undefined, "2026-09-10")).toThrow(
      "Informe a data inicial (from) no formato AAAA-MM-DD.",
    );
    expect(() => parseReportPeriod("2026-09-01", undefined)).toThrow(
      "Informe a data final (to) no formato AAAA-MM-DD.",
    );
    expect(() =>
      parseReportPeriod(["2026-09-01", "2026-09-02"], "2026-09-10"),
    ).toThrow(MemberReportInvalidPeriodException);
  });
});
