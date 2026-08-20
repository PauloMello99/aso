import type { CustomerUpdateFormValues } from "../schemas/customer-update.schemas"

const GENDERS = ["male", "female", "other"] as const
type Gender = (typeof GENDERS)[number]

function toGenderValue(value: string): Gender | null {
  return (GENDERS as readonly string[]).includes(value)
    ? (value as Gender)
    : null
}

export interface CustomerUpdateSubmitBody {
  name?: string
  email?: string
  birthDate?: string
  phone?: string | null
  gender?: Gender | null
  address?: string
  number?: string
  addressLine2?: string | null
  city?: string
  state?: string
  postalCode?: string | null
  country?: string | null
}

export type CustomerUpdateDirtyFields = Partial<
  Record<keyof CustomerUpdateFormValues, boolean>
>

/**
 * Contrato de PATCH parcial: chaves não tocadas pelo usuário (`!dirtyFields[x]`)
 * são OMITIDAS do corpo — nunca `undefined` explícito, nunca `null` — porque o
 * backend trata "campo ausente" como "não alterar". Enviar `null` para um campo
 * nullable intocado apagaria silenciosamente o valor atual do cliente (ex.:
 * `gender`, que nunca chega no GET mas é aceito no submit). Só campo tocado E
 * deixado em branco vira `null` explícito (limpar valor); tocado e preenchido
 * vai como string.
 */
export function buildPartialUpdateBody(
  dirtyFields: CustomerUpdateDirtyFields,
  values: CustomerUpdateFormValues,
): CustomerUpdateSubmitBody {
  const body: CustomerUpdateSubmitBody = {}

  if (dirtyFields.name) body.name = values.name.trim()
  if (dirtyFields.email) body.email = values.email.trim()
  if (dirtyFields.birthDate) body.birthDate = values.birthDate
  if (dirtyFields.address) body.address = values.address.trim()
  if (dirtyFields.number) body.number = values.number.trim()
  if (dirtyFields.city) body.city = values.city.trim()
  if (dirtyFields.state) body.state = values.state.trim()

  if (dirtyFields.phone) body.phone = values.phone.trim() || null
  if (dirtyFields.gender) body.gender = toGenderValue(values.gender)
  if (dirtyFields.addressLine2) {
    body.addressLine2 = values.addressLine2.trim() || null
  }
  if (dirtyFields.postalCode) body.postalCode = values.postalCode.trim() || null
  if (dirtyFields.country) body.country = values.country.trim() || null

  return body
}
