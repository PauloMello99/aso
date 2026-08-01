import { InsufficientStockException } from "./insufficient-stock.exception";

describe("InsufficientStockException", () => {
  it("expõe details estruturados com materialId, available e requested", () => {
    const exception = new InsufficientStockException(
      "material-1",
      "1",
      "5",
    );

    expect(exception.details).toEqual({
      materialId: "material-1",
      available: "1",
      requested: "5",
    });
  });

  it("não expõe o materialId na mensagem (N7 — evita vazar ID interno na UI)", () => {
    const exception = new InsufficientStockException(
      "material-1",
      "1",
      "5",
    );

    expect(exception.message).not.toContain("material-1");
  });

  it("mantém o code INSUFFICIENT_STOCK", () => {
    const exception = new InsufficientStockException(
      "material-1",
      "1",
      "5",
    );

    expect(exception.code).toBe("INSUFFICIENT_STOCK");
  });
});
