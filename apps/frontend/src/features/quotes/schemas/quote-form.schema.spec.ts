import { describe, expect, it } from "vitest"
import {
  submitQuoteRequestFormSchema,
  upsertMyQuoteFormSchema,
} from "./quote-form.schema"

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria Silva",
    phone: "(11) 91234-5678",
    email: "maria@example.com",
    idea: "Uma rosa no antebraço",
    privacyConsent: true,
    contactRetentionConsent: false,
    turnstileToken: "token-valido",
    ...overrides,
  }
}

function buildForm(overrides: Record<string, unknown> = {}) {
  return {
    slug: "meu-estudio",
    displayName: "Maria Tattoo",
    enabled: true,
    ...overrides,
  }
}

describe("submitQuoteRequestFormSchema", () => {
  it("aceita payload válido", () => {
    expect(submitQuoteRequestFormSchema.safeParse(buildRequest()).success).toBe(
      true,
    )
  })

  it("rejeita privacyConsent false", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(
        buildRequest({ privacyConsent: false }),
      ).success,
    ).toBe(false)
  })

  it("aceita contactRetentionConsent true e false", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(
        buildRequest({ contactRetentionConsent: true }),
      ).success,
    ).toBe(true)
  })

  it("rejeita turnstileToken vazio", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(buildRequest({ turnstileToken: "" }))
        .success,
    ).toBe(false)
  })

  it("rejeita nome vazio ou só com espaços", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(buildRequest({ name: "   " }))
        .success,
    ).toBe(false)
  })

  it("rejeita telefone com poucos dígitos e aceita com máscara", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(buildRequest({ phone: "1234" }))
        .success,
    ).toBe(false)
    expect(
      submitQuoteRequestFormSchema.safeParse(
        buildRequest({ phone: "+55 11 91234-5678" }),
      ).success,
    ).toBe(true)
  })

  it("rejeita e-mail inválido", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(buildRequest({ email: "x" }))
        .success,
    ).toBe(false)
  })

  it("limita a ideia a 2000 caracteres", () => {
    expect(
      submitQuoteRequestFormSchema.safeParse(
        buildRequest({ idea: "a".repeat(2000) }),
      ).success,
    ).toBe(true)
    expect(
      submitQuoteRequestFormSchema.safeParse(
        buildRequest({ idea: "a".repeat(2001) }),
      ).success,
    ).toBe(false)
  })
})

describe("upsertMyQuoteFormSchema", () => {
  it("aceita payload válido", () => {
    expect(upsertMyQuoteFormSchema.safeParse(buildForm()).success).toBe(true)
  })

  it("normaliza o slug para minúsculas e remove espaços", () => {
    const result = upsertMyQuoteFormSchema.safeParse(
      buildForm({ slug: "  Meu-Estudio " }),
    )
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.slug).toBe("meu-estudio")
  })

  it("rejeita slug com dois hífens seguidos", () => {
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "meu--estudio" }))
        .success,
    ).toBe(false)
  })

  it("rejeita slug com hífen nas bordas", () => {
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "-estudio" })).success,
    ).toBe(false)
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "estudio-" })).success,
    ).toBe(false)
  })

  it("rejeita slug com caracteres inválidos", () => {
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "meu estudio" }))
        .success,
    ).toBe(false)
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "estúdio" })).success,
    ).toBe(false)
  })

  it("respeita os limites de tamanho do slug (3..40)", () => {
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "ab" })).success,
    ).toBe(false)
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "abc" })).success,
    ).toBe(true)
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "a".repeat(40) }))
        .success,
    ).toBe(true)
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ slug: "a".repeat(41) }))
        .success,
    ).toBe(false)
  })

  it("rejeita displayName vazio ou acima de 80", () => {
    expect(
      upsertMyQuoteFormSchema.safeParse(buildForm({ displayName: " " })).success,
    ).toBe(false)
    expect(
      upsertMyQuoteFormSchema.safeParse(
        buildForm({ displayName: "a".repeat(81) }),
      ).success,
    ).toBe(false)
  })
})
