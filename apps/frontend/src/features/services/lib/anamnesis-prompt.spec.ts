import { describe, expect, it } from "vitest"
import { resolveAnamnesisPrompt } from "./anamnesis-prompt"

describe("resolveAnamnesisPrompt", () => {
  it("retorna 'hidden' quando não há ficha vigente configurada", () => {
    expect(
      resolveAnamnesisPrompt({
        hasCurrentForm: false,
        linkableCount: 0,
        submittedCount: 0,
      }),
    ).toBe("hidden")
  })

  it("retorna 'hidden' quando existe resposta vinculável na versão vigente", () => {
    expect(
      resolveAnamnesisPrompt({
        hasCurrentForm: true,
        linkableCount: 1,
        submittedCount: 0,
      }),
    ).toBe("hidden")
  })

  it("retorna 'resend' quando existe resposta enviada, mas desatualizada", () => {
    expect(
      resolveAnamnesisPrompt({
        hasCurrentForm: true,
        linkableCount: 0,
        submittedCount: 1,
      }),
    ).toBe("resend")
  })

  it("retorna 'send' quando não há nenhuma resposta enviada", () => {
    expect(
      resolveAnamnesisPrompt({
        hasCurrentForm: true,
        linkableCount: 0,
        submittedCount: 0,
      }),
    ).toBe("send")
  })
})
