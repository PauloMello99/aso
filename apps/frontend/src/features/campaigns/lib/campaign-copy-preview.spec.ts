import { describe, expect, it } from "vitest"
import { unsubscribeSuccessMessage } from "./campaign-copy-preview"

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
