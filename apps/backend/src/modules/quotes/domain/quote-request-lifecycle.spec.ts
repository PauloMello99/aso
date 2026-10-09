import {
  QUOTE_ORPHAN_MIN_AGE_MS,
  QUOTE_ORPHAN_SWEEP_INTERVAL_MS,
  QUOTE_PURGE_LEASE_MS,
  toPurgeErrorCode,
} from "./quote-request-lifecycle";

const CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

describe("toPurgeErrorCode", () => {
  it("usa error.name", () => {
    const error = new Error("joao@example.com falhou");
    error.name = "StorageOperationFailedException";

    expect(toPurgeErrorCode(error)).toBe("StorageOperationFailedException");
  });

  it("acrescenta o SQLSTATE quando existe", () => {
    const error = Object.assign(new Error("x"), {
      name: "QuoteRequestPersistenceError",
      sqlState: "23505",
    });

    expect(toPurgeErrorCode(error)).toBe("QuoteRequestPersistenceError:23505");
  });

  it("nunca inclui a mensagem do erro", () => {
    const code = toPurgeErrorCode(new Error("joao@example.com +5511999998888"));

    expect(code).toBe("Error");
    expect(code).not.toContain("joao");
  });

  it("sanea caracteres fora do regex e respeita 80 chars", () => {
    const error = new Error("x");
    error.name = `Bad Name/${"a".repeat(200)}`;

    const code = toPurgeErrorCode(error);

    expect(code).toMatch(CODE_PATTERN);
    expect(code.length).toBe(80);
  });

  it("usa fallback para valor nao-Error ou nome vazio apos saneamento", () => {
    expect(toPurgeErrorCode("boom")).toBe("UnknownError");
    expect(toPurgeErrorCode(null)).toBe("UnknownError");
    const error = new Error("x");
    error.name = "   ///";
    expect(toPurgeErrorCode(error)).toBe("UnknownError");
  });
});

describe("constantes de ciclo de vida", () => {
  it("mantem lease 10min, idade minima de orfao 24h e intervalo do sweep 6h", () => {
    expect(QUOTE_PURGE_LEASE_MS).toBe(600_000);
    expect(QUOTE_ORPHAN_MIN_AGE_MS).toBe(86_400_000);
    expect(QUOTE_ORPHAN_SWEEP_INTERVAL_MS).toBe(21_600_000);
  });
});
