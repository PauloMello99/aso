import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { cashierErrorMessage } from "./error-messages"

describe("cashierErrorMessage", () => {
  it("maps SERVICE_PAYMENT_NOT_CORRECTABLE to a pt-BR message", () => {
    const err = new ApiError(
      "not correctable",
      409,
      "/orgs/1/services/1/payment",
      "SERVICE_PAYMENT_NOT_CORRECTABLE",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Este pagamento de serviço não pode mais ser corrigido (serviço cancelado ou transação já estornada).",
    )
  })

  it("maps SERVICE_ALREADY_CANCELED to a pt-BR message", () => {
    const err = new ApiError(
      "canceled",
      409,
      "/orgs/1/services/1/payment",
      "SERVICE_ALREADY_CANCELED",
    )
    expect(cashierErrorMessage(err)).toBe(
      "O serviço vinculado a este lançamento foi cancelado.",
    )
  })

  it("maps TRANSACTION_IS_SERVICE_PAYMENT to a pt-BR message", () => {
    const err = new ApiError(
      "is service payment",
      409,
      "/orgs/1/cashier/transactions/1/correct",
      "TRANSACTION_IS_SERVICE_PAYMENT",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Este lançamento veio de um serviço — use a correção de pagamento do serviço.",
    )
  })

  it("maps SERVICE_NOT_FOUND to a pt-BR message", () => {
    const err = new ApiError(
      "not found",
      404,
      "/orgs/1/services/1/payment",
      "SERVICE_NOT_FOUND",
    )
    expect(cashierErrorMessage(err)).toBe("Serviço não encontrado.")
  })

  it("maps SERVICE_FORBIDDEN to a pt-BR message", () => {
    const err = new ApiError(
      "forbidden",
      403,
      "/orgs/1/services/1/payment",
      "SERVICE_FORBIDDEN",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Você não tem permissão para corrigir este pagamento.",
    )
  })

  it("maps TRANSACTION_NOT_FOUND to a pt-BR message", () => {
    const err = new ApiError(
      "not found",
      404,
      "/orgs/1/cashier/transactions/1",
      "TRANSACTION_NOT_FOUND",
    )
    expect(cashierErrorMessage(err)).toBe("Lançamento não encontrado.")
  })

  it("maps TRANSACTION_NOT_REVERSIBLE to a pt-BR message", () => {
    const err = new ApiError(
      "not reversible",
      409,
      "/orgs/1/cashier/transactions/1/reverse",
      "TRANSACTION_NOT_REVERSIBLE",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Este lançamento não pode mais ser estornado.",
    )
  })

  it("maps TRANSACTION_ALREADY_REVERSED to a pt-BR message", () => {
    const err = new ApiError(
      "already reversed",
      409,
      "/orgs/1/cashier/transactions/1/reverse",
      "TRANSACTION_ALREADY_REVERSED",
    )
    expect(cashierErrorMessage(err)).toBe("Este lançamento já foi estornado.")
  })

  it("maps CASHIER_FORBIDDEN to a pt-BR message", () => {
    const err = new ApiError(
      "forbidden",
      403,
      "/orgs/1/cashier/transactions/1/reverse",
      "CASHIER_FORBIDDEN",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Você não tem permissão para realizar esta ação no caixa.",
    )
  })

  it("uses err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/services/1/payment",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(cashierErrorMessage(err)).toBe(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
    )
  })

  it("falls back to a generic message for an unmapped ApiError code (never leaks err.message)", () => {
    const err = new ApiError(
      "some other server error",
      500,
      "/orgs/1/cashier/transactions",
      "SOME_OTHER_CODE",
    )
    expect(cashierErrorMessage(err)).toBe("Não foi possível corrigir.")
  })

  it("falls back to err.message for a generic Error without a code", () => {
    expect(cashierErrorMessage(new Error("boom"))).toBe("boom")
  })

  it("falls back to a generic message for a non-Error value", () => {
    expect(cashierErrorMessage("boom")).toBe("Não foi possível corrigir.")
  })
})
