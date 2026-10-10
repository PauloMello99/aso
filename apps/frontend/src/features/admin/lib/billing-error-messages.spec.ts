import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { billingErrorMessage } from "./billing-error-messages"

function apiError(message: string, code?: string, status = 400) {
  return new ApiError(message, status, "/admin/billing/coupons", code)
}

describe("billingErrorMessage", () => {
  it("traduz código de cupom duplicado com orientação", () => {
    expect(
      billingErrorMessage(
        apiError("whatever", "BILLING_COUPON_CODE_ALREADY_EXISTS", 409),
      ),
    ).toBe(
      "Já existe um cupom ativo com esse código. Desative-o antes de reutilizar o código ou escolha outro.",
    )
  })

  it("traduz cupom esgotado/expirado ao reativar", () => {
    expect(
      billingErrorMessage(
        apiError("whatever", "BILLING_COUPON_NOT_REDEEMABLE", 422),
      ),
    ).toContain("não pode ser reativado")
  })

  it("prefere a mensagem do backend em INVALID_COUPON_CONFIG", () => {
    expect(
      billingErrorMessage(
        apiError("O código do cupom é obrigatório.", "INVALID_COUPON_CONFIG"),
      ),
    ).toBe("O código do cupom é obrigatório.")
  })

  it("cai no texto fixo quando a mensagem é o fallback técnico", () => {
    expect(
      billingErrorMessage(
        apiError("Request failed with status 400", "INVALID_COUPON_CONFIG"),
      ),
    ).toContain("Configuração de cupom inválida")
  })

  it("usa mensagem genérica para código desconhecido", () => {
    expect(billingErrorMessage(apiError("boom", "SOMETHING_ELSE", 500))).toBe(
      "Não foi possível concluir a operação de billing.",
    )
  })

  it("mantém a mensagem de erros comuns", () => {
    expect(billingErrorMessage(new Error("rede caiu"))).toBe("rede caiu")
  })
})
