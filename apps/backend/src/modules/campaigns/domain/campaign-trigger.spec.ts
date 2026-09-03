import { buildDedupeKey, toUtcDateString } from "./campaign-trigger";

describe("buildDedupeKey", () => {
  const referenceDate = new Date("2026-03-09T22:00:00.000Z");

  it("gera 'post_service:<serviceId>' para o gatilho post_service", () => {
    expect(
      buildDedupeKey("post_service", {
        serviceId: "svc-1",
        referenceDate,
      }),
    ).toBe("post_service:svc-1");
  });

  it("gera 'birthday:<customerId>:<YYYY>' com o ano em UTC", () => {
    expect(
      buildDedupeKey("birthday", {
        customerId: "cus-1",
        referenceDate,
      }),
    ).toBe("birthday:cus-1:2026");
  });

  it("gera 'inactivity:<customerId>:<YYYY-MM>' com o mês em UTC e zero-padded", () => {
    expect(
      buildDedupeKey("inactivity", {
        customerId: "cus-1",
        referenceDate,
      }),
    ).toBe("inactivity:cus-1:2026-03");
  });

  it("lança Error quando falta serviceId no gatilho post_service", () => {
    expect(() =>
      buildDedupeKey("post_service", { referenceDate }),
    ).toThrow(/serviceId/);
  });

  it("lança Error quando falta customerId no gatilho birthday", () => {
    expect(() =>
      buildDedupeKey("birthday", { referenceDate }),
    ).toThrow(/customerId/);
  });

  it("lança Error quando falta customerId no gatilho inactivity", () => {
    expect(() =>
      buildDedupeKey("inactivity", { referenceDate }),
    ).toThrow(/customerId/);
  });

  it("trata id vazio como ausente (não cunha chave colidente)", () => {
    expect(() =>
      buildDedupeKey("post_service", { serviceId: "", referenceDate }),
    ).toThrow(/serviceId/);
  });
});

describe("toUtcDateString", () => {
  it("devolve a data-calendário em UTC no formato YYYY-MM-DD", () => {
    expect(toUtcDateString(new Date("2026-03-09T22:00:00.000Z"))).toBe(
      "2026-03-09",
    );
  });

  it("usa o dia UTC quando o instante local já virou (base de buildDedupeKey)", () => {
    // 2026-08-31T23:30-03:00 == 2026-09-01T02:30Z -> dia UTC é 01/09
    const date = new Date("2026-09-01T02:30:00.000Z");
    expect(toUtcDateString(date)).toBe("2026-09-01");
    // left(x, 4) / left(x, 7) no SQL têm de bater com buildDedupeKey
    expect(toUtcDateString(date).slice(0, 4)).toBe(
      String(date.getUTCFullYear()),
    );
    expect(buildDedupeKey("inactivity", { customerId: "c", referenceDate: date })).toBe(
      `inactivity:c:${toUtcDateString(date).slice(0, 7)}`,
    );
  });
});
