import {
  computeSlaDueDates,
  isSlaBreached,
  isSlaNearBreach,
} from "./ticket-sla";

describe("computeSlaDueDates", () => {
  it("soma os minutos de SLA da categoria à data de criação (24/7 wall-clock)", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    const { slaFirstResponseDueAt, slaResolutionDueAt } = computeSlaDueDates(
      createdAt,
      { slaFirstResponseMinutes: 60, slaResolutionMinutes: 1440 },
    );

    expect(slaFirstResponseDueAt.toISOString()).toBe(
      "2026-01-01T01:00:00.000Z",
    );
    expect(slaResolutionDueAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("isSlaBreached", () => {
  it("retorna false quando ainda está dentro da janela", () => {
    const dueAt = new Date("2026-01-01T01:00:00.000Z");
    const now = new Date("2026-01-01T00:30:00.000Z");

    expect(isSlaBreached(now, dueAt)).toBe(false);
  });

  it("retorna false quando exatamente no limite", () => {
    const dueAt = new Date("2026-01-01T01:00:00.000Z");
    const now = new Date("2026-01-01T01:00:00.000Z");

    expect(isSlaBreached(now, dueAt)).toBe(false);
  });

  it("retorna true quando estourado", () => {
    const dueAt = new Date("2026-01-01T01:00:00.000Z");
    const now = new Date("2026-01-01T01:00:00.001Z");

    expect(isSlaBreached(now, dueAt)).toBe(true);
  });
});

describe("isSlaNearBreach", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const dueAt = new Date("2026-01-01T01:00:00.000Z"); // janela de 60 min

  it("retorna false quando resta mais de 20% da janela", () => {
    const now = new Date("2026-01-01T00:30:00.000Z"); // resta 30min (50%)

    expect(isSlaNearBreach(now, dueAt, createdAt)).toBe(false);
  });

  it("retorna true quando resta exatamente 20% da janela (limite)", () => {
    const now = new Date("2026-01-01T00:48:00.000Z"); // resta 12min (20%)

    expect(isSlaNearBreach(now, dueAt, createdAt)).toBe(true);
  });

  it("retorna true quando resta menos de 20% da janela", () => {
    const now = new Date("2026-01-01T00:55:00.000Z"); // resta 5min

    expect(isSlaNearBreach(now, dueAt, createdAt)).toBe(true);
  });

  it("retorna false quando já estourou (breach não é 'near breach')", () => {
    const now = new Date("2026-01-01T01:05:00.000Z");

    expect(isSlaNearBreach(now, dueAt, createdAt)).toBe(false);
  });
});
