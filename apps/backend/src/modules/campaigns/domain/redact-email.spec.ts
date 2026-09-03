import { redactEmail } from "./redact-email";

describe("redactEmail", () => {
  it("substitui um endereço de e-mail por [email redigido]", () => {
    expect(redactEmail("SMTP 550 to ana@example.com rejected")).toBe(
      "SMTP 550 to [email redigido] rejected",
    );
  });

  it("substitui todos os endereços quando há mais de um", () => {
    expect(
      redactEmail("from billing@studio.com.br to ana.paula@gmail.com bounced"),
    ).toBe("from [email redigido] to [email redigido] bounced");
  });

  it("mantém a mensagem intacta quando não há e-mail", () => {
    expect(redactEmail("provider 500 internal error")).toBe(
      "provider 500 internal error",
    );
  });

  it("trunca em 300 caracteres", () => {
    const long = "x".repeat(500);
    expect(redactEmail(long)).toHaveLength(300);
  });

  it("redige antes de truncar (nenhum e-mail cru sobrevive à truncagem)", () => {
    const msg = `550 ana@example.com ${"x".repeat(400)}`;
    const out = redactEmail(msg);
    expect(out).not.toContain("ana@example.com");
    expect(out).toContain("[email redigido]");
    expect(out).toHaveLength(300);
  });
});
