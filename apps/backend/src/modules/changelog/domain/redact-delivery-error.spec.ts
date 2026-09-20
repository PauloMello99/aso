import {
  classifyDeliveryError,
  redactDeliveryError,
} from "./redact-delivery-error";

describe("classifyDeliveryError", () => {
  it("cai em unknown_error para vazio, whitespace, undefined, null e objeto sem message", () => {
    expect(classifyDeliveryError("")).toBe("unknown_error");
    expect(classifyDeliveryError("   ")).toBe("unknown_error");
    expect(classifyDeliveryError(undefined)).toBe("unknown_error");
    expect(classifyDeliveryError(null)).toBe("unknown_error");
    expect(classifyDeliveryError({ to: "a@b.com" })).toBe("unknown_error");
  });

  it("preserva o literal send_returned_false do use-case", () => {
    expect(classifyDeliveryError("send_returned_false")).toBe(
      "send_returned_false",
    );
  });

  it("classifica falhas de rede", () => {
    for (const msg of [
      "request timeout",
      "connect ETIMEDOUT 1.2.3.4:443",
      "read ECONNRESET",
      "connect ECONNREFUSED",
      "fetch failed",
      "Network unreachable",
    ]) {
      expect(classifyDeliveryError(new Error(msg))).toBe("network_error");
    }
  });

  it("classifica status HTTP isolado 4xx/5xx", () => {
    expect(classifyDeliveryError(new Error("Resend responded 422"))).toBe(
      "provider_http_422",
    );
    expect(classifyDeliveryError("status 503 upstream")).toBe(
      "provider_http_503",
    );
  });

  it("não confunde números maiores com status HTTP", () => {
    expect(classifyDeliveryError("id 14045 rejeitado")).toBe("provider_error");
  });

  it("qualquer outro Error/string vira provider_error", () => {
    expect(classifyDeliveryError(new Error("boom"))).toBe("provider_error");
    expect(classifyDeliveryError("algo deu errado")).toBe("provider_error");
    expect(classifyDeliveryError({ message: "x" })).toBe("provider_error");
  });

  it("nenhum trecho da mensagem original persiste (e-mail, texto livre)", () => {
    for (const raw of [
      "rejected foo@bar.com by provider",
      new Error("bad a@b.com 422 timeout"),
      `${"x".repeat(500)} user@example.com`,
    ]) {
      const out = classifyDeliveryError(raw);
      expect(out).toMatch(
        /^(send_returned_false|network_error|provider_http_[45]\d{2}|provider_error|unknown_error)$/,
      );
      expect(out).not.toContain("@");
      expect(out).not.toContain("example");
    }
  });

  it("é idempotente para classes já conhecidas", () => {
    for (const cls of [
      "network_error",
      "provider_http_429",
      "provider_error",
      "unknown_error",
    ]) {
      expect(classifyDeliveryError(cls)).toBe(cls);
    }
  });
});

describe("redactDeliveryError", () => {
  it("devolve a classificação, não o texto", () => {
    expect(redactDeliveryError("rejected foo@bar.com by provider")).toBe(
      "provider_error",
    );
    expect(redactDeliveryError(undefined)).toBe("unknown_error");
  });
});
