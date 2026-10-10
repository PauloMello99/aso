import { describe, expect, it } from "vitest";
import {
  EMPTY_COUPON_FORM,
  buildCouponSummary,
  buildCreateCouponInput,
  getCouponFormErrors,
  normalizeCouponCode,
  parsePositiveInteger,
  validateCouponCode,
  type CouponFormValues,
} from "./billing-coupon-form";

function form(overrides: Partial<CouponFormValues> = {}): CouponFormValues {
  return {
    ...EMPTY_COUPON_FORM,
    name: "Promo de lançamento",
    percentOff: "20",
    code: "launch20",
    ...overrides,
  };
}

describe("validateCouponCode", () => {
  it("exige o código", () => {
    expect(validateCouponCode("")).toBe("required");
    expect(validateCouponCode("   ")).toBe("required");
  });

  it("aceita após trim + uppercase", () => {
    expect(validateCouponCode("  launch-20_a ")).toBeNull();
    expect(normalizeCouponCode("  launch-20 ")).toBe("LAUNCH-20");
  });

  it("rejeita curto, longo e caracteres inválidos", () => {
    expect(validateCouponCode("ab")).toBe("invalid");
    expect(validateCouponCode("a".repeat(65))).toBe("invalid");
    expect(validateCouponCode("promo 20")).toBe("invalid");
    expect(validateCouponCode("promo$20")).toBe("invalid");
    expect(validateCouponCode("promoção")).toBe("invalid");
  });
});

describe("parsePositiveInteger", () => {
  it("aceita só inteiros positivos", () => {
    expect(parsePositiveInteger("7")).toBe(7);
    expect(parsePositiveInteger(" 12 ")).toBe(12);
    expect(parsePositiveInteger("0")).toBeNull();
    expect(parsePositiveInteger("-3")).toBeNull();
    expect(parsePositiveInteger("1.5")).toBeNull();
    expect(parsePositiveInteger("1e2")).toBeNull();
    expect(parsePositiveInteger("")).toBeNull();
  });
});

describe("getCouponFormErrors", () => {
  it("formulário válido não tem erros", () => {
    expect(getCouponFormErrors(form())).toEqual([]);
  });

  it("aponta nome, desconto, código e limite inválidos", () => {
    expect(
      getCouponFormErrors(
        form({ name: " ", percentOff: "150", code: "", maxRedemptions: "4,5" }),
      ),
    ).toEqual(["name", "discount", "code", "maxRedemptions"]);
  });

  it("exige meses quando recorrente", () => {
    expect(
      getCouponFormErrors(
        form({ duration: "repeating", durationInMonths: "" }),
      ),
    ).toEqual(["durationInMonths"]);
    expect(
      getCouponFormErrors(
        form({ duration: "repeating", durationInMonths: "3" }),
      ),
    ).toEqual([]);
  });

  it("valida valor fixo em reais", () => {
    expect(
      getCouponFormErrors(form({ discountKind: "amount", amountOff: "" })),
    ).toEqual(["discount"]);
    expect(
      getCouponFormErrors(form({ discountKind: "amount", amountOff: "10,50" })),
    ).toEqual([]);
  });

  it("expiração: hoje é válido (até 23:59:59), passado é inválido", () => {
    const now = new Date("2030-01-15T10:00:00");
    expect(getCouponFormErrors(form({ expiresAt: "2030-01-15" }), now)).toEqual(
      [],
    );
    expect(getCouponFormErrors(form({ expiresAt: "2030-01-16" }), now)).toEqual(
      [],
    );
    expect(getCouponFormErrors(form({ expiresAt: "2030-01-14" }), now)).toEqual(
      ["expiresAt"],
    );
    expect(getCouponFormErrors(form({ expiresAt: "" }), now)).toEqual([]);
  });
});

describe("buildCreateCouponInput", () => {
  it("retorna null quando inválido", () => {
    expect(buildCreateCouponInput(form({ code: "" }))).toBeNull();
  });

  it("monta payload percentual com código normalizado e limite", () => {
    expect(
      buildCreateCouponInput(form({ code: " launch20 ", maxRedemptions: "7" })),
    ).toEqual({
      name: "Promo de lançamento",
      duration: "once",
      code: "LAUNCH20",
      percentOff: 20,
      maxRedemptions: 7,
    });
  });

  it("monta payload de valor fixo recorrente com expiração", () => {
    const input = buildCreateCouponInput(
      form({
        discountKind: "amount",
        amountOff: "10,50",
        duration: "repeating",
        durationInMonths: "3",
        expiresAt: "2030-01-31",
      }),
    );
    expect(input).toMatchObject({
      amountOffCents: 1050,
      currency: "brl",
      durationInMonths: 3,
    });
    expect(input).not.toHaveProperty("percentOff");
    expect(input).not.toHaveProperty("maxRedemptions");
    expect(input?.expiresAt).toBe(
      new Date("2030-01-31T23:59:59").toISOString(),
    );
  });
});

describe("buildCouponSummary", () => {
  it("mostra 'Sem limite' e 'Sem expiração' explicitamente", () => {
    const rows = buildCouponSummary(form());
    expect(rows).toContainEqual({ label: "Código", value: "LAUNCH20" });
    expect(rows).toContainEqual({ label: "Desconto", value: "20%" });
    expect(rows).toContainEqual({
      label: "Limite de resgates",
      value: "Sem limite",
    });
    expect(rows).toContainEqual({ label: "Expira em", value: "Sem expiração" });
  });

  it("mostra o limite digitado, duração recorrente e expiração formatada", () => {
    const rows = buildCouponSummary(
      form({
        maxRedemptions: "4",
        duration: "repeating",
        durationInMonths: "3",
        expiresAt: "2030-01-31",
      }),
    );
    expect(rows).toContainEqual({
      label: "Limite de resgates",
      value: "4 resgates",
    });
    expect(rows).toContainEqual({
      label: "Duração",
      value: "Recorrente por 3 meses",
    });
    expect(rows).toContainEqual({
      label: "Expira em",
      value: "Válido até 31/01/2030",
    });
  });
});
