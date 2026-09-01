import { describe, expect, it } from "vitest"
import {
  PREVIEW_CUSTOMER_NAME,
  interpolateCampaignCopy,
  unsubscribeSuccessMessage,
} from "./campaign-copy-preview"

describe("interpolateCampaignCopy", () => {
  it("substitui {{customerName}} pelo nome de exemplo", () => {
    expect(interpolateCampaignCopy("Olá {{customerName}}!", "Studio X")).toBe(
      `Olá ${PREVIEW_CUSTOMER_NAME}!`,
    )
  })

  it("substitui {{orgName}} pelo nome real da organização", () => {
    expect(interpolateCampaignCopy("Enviado por {{orgName}}", "Studio X")).toBe(
      "Enviado por Studio X",
    )
  })

  it("substitui todas as ocorrências de cada token", () => {
    const out = interpolateCampaignCopy(
      "{{customerName}}, a {{orgName}} agradece. Até logo, {{customerName}}.",
      "Studio X",
    )
    expect(out).toBe(
      `${PREVIEW_CUSTOMER_NAME}, a Studio X agradece. Até logo, ${PREVIEW_CUSTOMER_NAME}.`,
    )
  })

  it("tolera espaços dentro das chaves do token", () => {
    expect(interpolateCampaignCopy("Oi {{ customerName }}", "Studio X")).toBe(
      `Oi ${PREVIEW_CUSTOMER_NAME}`,
    )
  })

  it("mantém o texto quando não há tokens", () => {
    expect(interpolateCampaignCopy("Sem tokens aqui", "Studio X")).toBe(
      "Sem tokens aqui",
    )
  })

  it("preserva quebras de linha do corpo multi-parágrafo", () => {
    expect(interpolateCampaignCopy("linha 1\n\nlinha 2", "Studio X")).toBe(
      "linha 1\n\nlinha 2",
    )
  })

  it("retorna string vazia para entrada vazia", () => {
    expect(interpolateCampaignCopy("", "Studio X")).toBe("")
  })
})

describe("unsubscribeSuccessMessage", () => {
  it("gera a mensagem por gatilho com o nome da organização", () => {
    expect(unsubscribeSuccessMessage("birthday", "Studio X")).toBe(
      "Pronto. Você não vai mais receber a mensagem de aniversário de Studio X.",
    )
  })

  it("gera a mensagem global", () => {
    expect(unsubscribeSuccessMessage("all", "Studio X")).toBe(
      "Pronto. Você não vai mais receber e-mails de Studio X.",
    )
  })
})
