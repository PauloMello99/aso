import { apiRequest } from "@/infrastructure/api/client"
import type {
  MyQuoteForm,
  MyQuoteFormRecord,
  PublicQuoteForm,
  SubmitQuoteRequestFormValues,
  UpsertMyQuoteFormValues,
} from "../schemas/quote-form.schema"

/**
 * Rotas `public/quote-forms/*` — sem auth. `skipAuth: true` é obrigatório
 * (mesmo racional de `public-support.api.ts`): sem ele um 401 derrubaria a
 * sessão e redirecionaria um visitante anônimo para o login.
 */

export function getPublicQuoteForm(slug: string): Promise<PublicQuoteForm> {
  return apiRequest<PublicQuoteForm>(
    `/public/quote-forms/${encodeURIComponent(slug)}`,
    { skipAuth: true },
  )
}

export function submitQuoteRequest(
  slug: string,
  values: Omit<SubmitQuoteRequestFormValues, "turnstileToken"> & {
    consentVersion: string
  },
  files: File[],
  turnstileToken: string,
): Promise<{ received: true }> {
  const body = new FormData()
  body.append("name", values.name)
  body.append("phone", values.phone)
  body.append("email", values.email)
  body.append("idea", values.idea)
  body.append("consentVersion", values.consentVersion)
  body.append("privacyConsent", String(values.privacyConsent))
  body.append("contactRetentionConsent", String(values.contactRetentionConsent))
  for (const file of files) body.append("images", file)

  return apiRequest<{ received: true }>(
    `/public/quote-forms/${encodeURIComponent(slug)}/requests`,
    {
      method: "POST",
      body,
      headers: { "x-turnstile-token": turnstileToken },
      skipAuth: true,
    },
  )
}

export function getMyQuoteForm(orgId: string): Promise<MyQuoteForm> {
  return apiRequest<MyQuoteForm>(`/orgs/${orgId}/quote-forms/me`)
}

export function upsertMyQuoteForm(
  orgId: string,
  body: UpsertMyQuoteFormValues,
): Promise<MyQuoteFormRecord> {
  return apiRequest<MyQuoteFormRecord>(`/orgs/${orgId}/quote-forms/me`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
