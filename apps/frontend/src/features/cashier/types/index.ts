export type TransactionType = "income" | "outcome"

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"

export interface Transaction {
  id: string
  orgId: string
  createdBy: string | null
  description: string
  type: TransactionType
  netCents: number
  grossCents: number
  feeCents: number
  paymentMethod: PaymentMethod
  categoryId: string | null
  reversesTransactionId: string | null
  transactedAt: string
  createdAt: string
}

export interface TransactionCategory {
  id: string
  orgId: string
  name: string
  isProtected: boolean
  systemKey: string | null
  createdAt: string
}

export interface TransactionView {
  entity: Transaction
  reversed: boolean
  serviceId: string | null
}

export interface Balance {
  cashCents: number
  digitalCents: number
  totalCents: number
}

export interface DailyBalancePoint {
  day: string
  cashCents: number
  digitalCents: number
  totalCents: number
}

export interface PaymentFee {
  id: string
  orgId: string
  paymentMethod: PaymentMethod
  percent: string
  fixedCents: number
  createdAt: string
  updatedAt: string
}

export interface TransactionsFilter {
  from?: string
  to?: string
  type?: TransactionType
  paymentMethod?: PaymentMethod
  categoryId?: string
  minCents?: number
  maxCents?: number
  createdBy?: string
  customerId?: string
  q?: string
  page?: number
  limit?: number
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência / Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
}

// Rótulos de CARTEIRA usados apenas no diálogo de transferência entre caixas
// (origem/destino). Não confundir com PAYMENT_METHOD_LABELS, usado em todo o
// resto da UI de caixa (extrato, form, errata, taxas, filtro, histórico).
export const TRANSFER_METHOD_LABELS = {
  cash: "Dinheiro Físico",
  bank_transfer: "Banco Digital",
} as const satisfies Record<string, string>

export type TransferMethod = keyof typeof TRANSFER_METHOD_LABELS

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Entrada",
  outcome: "Saída",
}

export const DIGITAL_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "credit_card",
  "debit_card",
]

export const FEE_ELIGIBLE_METHODS: PaymentMethod[] = [
  "credit_card",
  "debit_card",
]

export type CommissionMode = "gross" | "net"

export interface MemberCommission {
  userId: string
  name: string
  role: "owner" | "employee"
  percent: string
  mode: CommissionMode | null
  configured: boolean
}

export const COMMISSION_MODE_LABELS: Record<CommissionMode, string> = {
  gross: "Sobre o valor bruto (estúdio absorve a taxa)",
  net: "Sobre o valor líquido (taxa dividida)",
}

// Métodos com taxa configurável (espelha FEE_ELIGIBLE_METHODS, mas como união
// literal para os shapes de taxa por membro, onde débito/crédito é o domínio
// inteiro).
export type FeeEligibleMethod = "credit_card" | "debit_card"

export type FeeSource = "member" | "org" | "none"

export interface MemberPaymentFee {
  userId: string
  name: string
  role: "owner" | "employee"
  paymentMethod: FeeEligibleMethod
  percent: string
  fixedCents: number
  source: FeeSource
  configured: boolean
}

export interface MemberPaymentFeeInput {
  userId: string
  paymentMethod: FeeEligibleMethod
  percent: string
  fixedCents: number
}

// Remove o override próprio do membro para aquele método (volta ao fallback da
// taxa da org). Vai no campo opcional `deactivations` do PUT /cashier/member-fees.
export interface MemberPaymentFeeDeactivation {
  userId: string
  paymentMethod: FeeEligibleMethod
}

// Corpo do PUT /cashier/member-fees: ambos opcionais (um payload só com
// `deactivations` é válido).
export interface MemberPaymentFeesUpdate {
  fees?: MemberPaymentFeeInput[]
  deactivations?: MemberPaymentFeeDeactivation[]
}
