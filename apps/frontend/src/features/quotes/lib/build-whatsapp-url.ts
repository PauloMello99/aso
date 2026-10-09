const BRAZIL_COUNTRY_CODE = "55"

/**
 * Link `https://wa.me/<digitos>` para responder ao solicitante. Sem texto
 * pré-preenchido (nada de PII na URL). Telefone sem `+` é tratado como número
 * brasileiro (prefixa 55); com `+` os dígitos já trazem o código do país.
 * Retorna `null` quando não há dígitos suficientes para um link válido.
 */
export function buildWhatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length === 0) return null

  const international = trimmed.startsWith("+")
    ? digits
    : `${BRAZIL_COUNTRY_CODE}${digits}`
  return `https://wa.me/${international}`
}
