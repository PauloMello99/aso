import {
  buildQuoteEventTitle,
  toUsableCustomerEmail,
} from "./quote-schedule";

describe("buildQuoteEventTitle", () => {
  it("prefixa e apara o nome", () => {
    expect(buildQuoteEventTitle("  Joao Silva ")).toBe("Orçamento: Joao Silva");
  });

  it("limita a 200 caracteres", () => {
    expect(buildQuoteEventTitle("x".repeat(500))).toHaveLength(200);
  });
});

describe("toUsableCustomerEmail", () => {
  it("normaliza (trim + lowercase)", () => {
    expect(toUsableCustomerEmail("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it.each(["", "   ", "semarroba", "a@b", "a b@c.com", "@x.com"])(
    "rejeita %j",
    (value) => {
      expect(toUsableCustomerEmail(value)).toBeNull();
    },
  );

  it("rejeita acima de 254 caracteres e aceita exatamente 254", () => {
    const local = "a".repeat(254 - "@x.co".length);
    expect(toUsableCustomerEmail(`${local}@x.co`)).toHaveLength(254);
    expect(toUsableCustomerEmail(`a${local}@x.co`)).toBeNull();
  });
});
