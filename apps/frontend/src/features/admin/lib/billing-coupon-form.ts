import { formatBRL, parseReaisToCents } from "@/features/cashier/lib/money"
import type {
  CouponDuration,
  CreateBillingCouponInput,
} from "@/features/billing/types"

export type CouponDiscountKind = "percent" | "amount"

export interface CouponFormValues {
  name: string
  discountKind: CouponDiscountKind
  percentOff: string
  amountOff: string
  duration: CouponDuration
  durationInMonths: string
  code: string
  maxRedemptions: string
  /** YYYY-MM-DD (DatePicker) ou vazio. */
  expiresAt: string
}

export const EMPTY_COUPON_FORM: CouponFormValues = {
  name: "",
  discountKind: "percent",
  percentOff: "",
  amountOff: "",
  duration: "once",
  durationInMonths: "",
  code: "",
  maxRedemptions: "",
  expiresAt: "",
}

// Mesma regra do backend (CreateBillingCouponUseCase): após trim + uppercase.
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,64}$/

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export type CouponCodeError = "required" | "invalid"

export function validateCouponCode(raw: string): CouponCodeError | null {
  const normalized = normalizeCouponCode(raw)
  if (normalized === "") return "required"
  return COUPON_CODE_PATTERN.test(normalized) ? null : "invalid"
}

export const COUPON_CODE_ERROR_MESSAGES: Record<CouponCodeError, string> = {
  required: "Informe o código do cupom.",
  invalid:
    "Use de 3 a 64 caracteres: letras, números, hífen (-) ou sublinhado (_).",
}

/** Inteiro positivo estrito (somente dígitos); null quando inválido/vazio. */
export function parsePositiveInteger(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function parsePercent(raw: string): number | null {
  const value = parsePositiveInteger(raw)
  return value !== null && value <= 100 ? value : null
}

function parseAmountCents(raw: string): number | null {
  if (raw.trim() === "") return null
  const cents = parseReaisToCents(raw)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}

export type CouponFormField =
  | "name"
  | "discount"
  | "durationInMonths"
  | "code"
  | "maxRedemptions"
  | "expiresAt"

/** Fim do dia local (23:59:59) da data YYYY-MM-DD; null se a data for inválida. */
function endOfLocalDay(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const date = new Date(`${isoDate}T23:59:59`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Campos inválidos (vazio = formulário pronto para revisão). */
export function getCouponFormErrors(
  values: CouponFormValues,
  now: Date = new Date(),
): CouponFormField[] {
  const errors: CouponFormField[] = []
  if (values.name.trim() === "") errors.push("name")

  const discountOk =
    values.discountKind === "percent"
      ? parsePercent(values.percentOff) !== null
      : parseAmountCents(values.amountOff) !== null
  if (!discountOk) errors.push("discount")

  if (
    values.duration === "repeating" &&
    parsePositiveInteger(values.durationInMonths) === null
  ) {
    errors.push("durationInMonths")
  }

  if (validateCouponCode(values.code) !== null) errors.push("code")

  if (
    values.maxRedemptions.trim() !== "" &&
    parsePositiveInteger(values.maxRedemptions) === null
  ) {
    errors.push("maxRedemptions")
  }

  if (values.expiresAt !== "") {
    const expiry = endOfLocalDay(values.expiresAt)
    if (expiry === null || expiry.getTime() <= now.getTime()) {
      errors.push("expiresAt")
    }
  }

  return errors
}

/** Payload da API; null quando o formulário é inválido. */
export function buildCreateCouponInput(
  values: CouponFormValues,
): CreateBillingCouponInput | null {
  if (getCouponFormErrors(values).length > 0) return null

  const maxRedemptions = parsePositiveInteger(values.maxRedemptions)
  const durationInMonths =
    values.duration === "repeating"
      ? parsePositiveInteger(values.durationInMonths)
      : null
  const percentOff = parsePercent(values.percentOff)
  const amountOffCents = parseAmountCents(values.amountOff)
  const expiresAtDate =
    values.expiresAt !== "" ? endOfLocalDay(values.expiresAt) : null

  return {
    name: values.name.trim(),
    duration: values.duration,
    code: normalizeCouponCode(values.code),
    ...(values.discountKind === "percent"
      ? percentOff !== null && { percentOff }
      : amountOffCents !== null && { amountOffCents, currency: "brl" }),
    ...(durationInMonths !== null && { durationInMonths }),
    ...(maxRedemptions !== null && { maxRedemptions }),
    // Válido até o fim do dia local escolhido.
    ...(expiresAtDate !== null && { expiresAt: expiresAtDate.toISOString() }),
  }
}

export interface CouponSummaryRow {
  label: string
  value: string
}

const DURATION_SUMMARY: Record<CouponDuration, string> = {
  once: "Única (primeira cobrança)",
  repeating: "Recorrente",
  forever: "Permanente",
}

function formatIsoDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-")
  return year && month && day ? `${day}/${month}/${year}` : isoDate
}

/** Resumo exibido no passo de confirmação antes de criar o cupom. */
export function buildCouponSummary(values: CouponFormValues): CouponSummaryRow[] {
  const percentOff = parsePercent(values.percentOff)
  const amountOffCents = parseAmountCents(values.amountOff)
  const months = parsePositiveInteger(values.durationInMonths)
  const maxRedemptions = parsePositiveInteger(values.maxRedemptions)

  const discount =
    values.discountKind === "percent"
      ? percentOff !== null
        ? `${percentOff}%`
        : "—"
      : amountOffCents !== null
        ? formatBRL(amountOffCents)
        : "—"

  const duration =
    values.duration === "repeating"
      ? `Recorrente por ${months ?? "—"} ${months === 1 ? "mês" : "meses"}`
      : DURATION_SUMMARY[values.duration]

  return [
    { label: "Código", value: normalizeCouponCode(values.code) },
    { label: "Nome", value: values.name.trim() },
    { label: "Desconto", value: discount },
    { label: "Duração", value: duration },
    {
      label: "Limite de resgates",
      value:
        maxRedemptions !== null
          ? `${maxRedemptions} ${maxRedemptions === 1 ? "resgate" : "resgates"}`
          : "Sem limite",
    },
    {
      label: "Expira em",
      value: values.expiresAt
        ? `Válido até ${formatIsoDateBR(values.expiresAt)}`
        : "Sem expiração",
    },
  ]
}
