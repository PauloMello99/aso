import { describe, expect, it } from "vitest"
import {
  memberPaymentBodySchema,
  memberPaymentFormSchema,
  toMemberPaymentBody,
  type MemberPaymentFormValues,
} from "./member-payment.schemas"

function buildFormValues(
  overrides: Partial<MemberPaymentFormValues> = {},
): MemberPaymentFormValues {
  return {
    amount: "150,00",
    paymentMethod: "cash",
    description: "",
    periodStart: "",
    periodEnd: "",
    ...overrides,
  }
}

describe("memberPaymentFormSchema", () => {
  it("aceita valor com vírgula decimal", () => {
    expect(memberPaymentFormSchema.safeParse(buildFormValues()).success).toBe(
      true,
    )
  })

  it("rejeita valor vazio", () => {
    expect(
      memberPaymentFormSchema.safeParse(buildFormValues({ amount: "" }))
        .success,
    ).toBe(false)
  })

  it("rejeita método de pagamento fora do enum", () => {
    const result = memberPaymentFormSchema.safeParse({
      ...buildFormValues(),
      paymentMethod: "pix",
    })
    expect(result.success).toBe(false)
  })

  it("aceita período em formato yyyy-MM-dd (saída do DatePicker)", () => {
    expect(
      memberPaymentFormSchema.safeParse(
        buildFormValues({ periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
      ).success,
    ).toBe(true)
  })

  it("rejeita período em formato inválido", () => {
    expect(
      memberPaymentFormSchema.safeParse(
        buildFormValues({ periodStart: "01/01/2026" }),
      ).success,
    ).toBe(false)
  })
})

describe("memberPaymentBodySchema", () => {
  it("aceita amountCents inteiro positivo", () => {
    expect(
      memberPaymentBodySchema.safeParse({
        amountCents: 15000,
        paymentMethod: "cash",
      }).success,
    ).toBe(true)
  })

  it("rejeita amountCents zero", () => {
    expect(
      memberPaymentBodySchema.safeParse({
        amountCents: 0,
        paymentMethod: "cash",
      }).success,
    ).toBe(false)
  })

  it("rejeita amountCents negativo", () => {
    expect(
      memberPaymentBodySchema.safeParse({
        amountCents: -100,
        paymentMethod: "cash",
      }).success,
    ).toBe(false)
  })

  it("rejeita amountCents não inteiro", () => {
    expect(
      memberPaymentBodySchema.safeParse({
        amountCents: 150.5,
        paymentMethod: "cash",
      }).success,
    ).toBe(false)
  })
})

describe("toMemberPaymentBody", () => {
  it("converte reais (vírgula) para centavos inteiros", () => {
    const body = toMemberPaymentBody(buildFormValues({ amount: "150,00" }))
    expect(body.amountCents).toBe(15000)
  })

  it("converte reais (ponto de milhar + vírgula) para centavos inteiros", () => {
    const body = toMemberPaymentBody(buildFormValues({ amount: "1.234,56" }))
    expect(body.amountCents).toBe(123456)
  })

  it("omite description quando vazia/whitespace", () => {
    const body = toMemberPaymentBody(
      buildFormValues({ description: "   " }),
    )
    expect(body.description).toBeUndefined()
  })

  it("preserva description com trim", () => {
    const body = toMemberPaymentBody(
      buildFormValues({ description: "  Bônus  " }),
    )
    expect(body.description).toBe("Bônus")
  })

  it("omite period quando vazio", () => {
    const body = toMemberPaymentBody(buildFormValues())
    expect(body.periodStart).toBeUndefined()
    expect(body.periodEnd).toBeUndefined()
  })

  it("propaga período quando preenchido", () => {
    const body = toMemberPaymentBody(
      buildFormValues({ periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
    )
    expect(body.periodStart).toBe("2026-01-01")
    expect(body.periodEnd).toBe("2026-01-31")
  })

  it("lança ao converter um valor que resulta em amountCents inválido (defesa em profundidade)", () => {
    expect(() =>
      toMemberPaymentBody(buildFormValues({ amount: "abc" })),
    ).toThrow()
  })
})
