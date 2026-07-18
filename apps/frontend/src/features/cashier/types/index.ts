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
  createdAt: string
}

export interface TransactionView {
  entity: Transaction
  reversed: boolean
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
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência / Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
}

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
