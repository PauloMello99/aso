export type ServicePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "debit_card"

export type ServiceStatus = "pending" | "paid" | "canceled"

export interface ServiceMaterialLine {
  id: string
  serviceId: string
  materialId: string
  quantity: string
  materialName: string | null
}

export interface Service {
  id: string
  orgId: string
  serviceTypeId: string | null
  customerId: string | null
  paymentTransactionId: string | null
  performedBy: string | null
  createdBy: string | null
  description: string | null
  amountCents: number
  paymentMethod: ServicePaymentMethod
  performedAt: string
  canceledAt: string | null
  createdAt: string
  updatedAt: string
  materials: ServiceMaterialLine[]
  customerName: string | null
  employeeName: string | null
  typeName: string | null
  anamnesisResponseId: string | null
}

export interface ServiceType {
  id: string
  orgId: string
  name: string
  description: string | null
  requiresAgeVerification: boolean
}

export interface ServicesFilter {
  from?: string
  to?: string
  serviceTypeId?: string
  customerId?: string
  performedBy?: string
  status?: ServiceStatus
  paymentMethod?: ServicePaymentMethod
  minCents?: number
  maxCents?: number
  q?: string
  page?: number
  limit?: number
}

export const SERVICE_PAYMENT_METHODS: ServicePaymentMethod[] = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
]

export const SERVICE_PAYMENT_METHOD_LABELS: Record<ServicePaymentMethod, string> =
  {
    cash: "Dinheiro",
    bank_transfer: "Transferência / Pix",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
  }

export const FEE_ELIGIBLE_METHODS: ServicePaymentMethod[] = [
  "credit_card",
  "debit_card",
]

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
}

export function serviceStatus(s: Service): ServiceStatus {
  if (s.canceledAt) return "canceled"
  return s.paymentTransactionId ? "paid" : "pending"
}
