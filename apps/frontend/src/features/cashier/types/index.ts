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
  /** Líquido em centavos — o que o caixa reflete. */
  netCents: number
  grossCents: number
  feeCents: number
  paymentMethod: PaymentMethod
  categoryId: string | null
  /** Quando preenchido, esta linha é o estorno da transação referenciada. */
  reversesTransactionId: string | null
  transactedAt: string
  createdAt: string
}

export interface TransactionCategory {
  id: string
  orgId: string
  name: string
  createdAt: string
}

/** Item da lista: a transação + se já foi estornada. */
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
  /** users.id — filtro de membro (só owner). */
  createdBy?: string
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

/** Métodos cujo saldo cai no bucket digital (banco/cartão). */
export const DIGITAL_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "credit_card",
  "debit_card",
]

/** Métodos que sofrem taxa configurável (cartão). */
export const FEE_ELIGIBLE_METHODS: PaymentMethod[] = [
  "credit_card",
  "debit_card",
]
