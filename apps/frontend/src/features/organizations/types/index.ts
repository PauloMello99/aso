import type { PaymentMethod } from "@/features/cashier/types"

export type OrgRole = "owner" | "employee"
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled"
export type MemberClassification = "resident" | "guest"

export const MEMBER_CLASSIFICATION_LABELS: Record<MemberClassification, string> = {
  resident: "Residente",
  guest: "Convidado",
}

export interface Member {
  memberId: string
  orgId: string
  userId: string
  role: OrgRole
  enabled: boolean
  permissions: string[]
  classification: MemberClassification | null
  userName: string
  userEmail: string
  joinedAt: string
}

export interface Invitation {
  id: string
  orgId: string
  invitedBy: string
  email: string
  role: OrgRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

export interface InviteResult {
  invitation: Invitation
  acceptUrl: string
}

export interface MemberPayment {
  id: string
  orgId: string
  userId: string
  transactionId: string
  amountCents: number
  periodStart: string | null
  periodEnd: string | null
  description: string | null
  // Presente quando esta linha É ELA MESMA um estorno (aponta para o
  // pagamento original que reverte). Não confundir com `reversed` de
  // MemberPaymentView, que indica que ESTA linha FOI estornada por outra.
  reversesPaymentId: string | null
  createdBy: string | null
  createdAt: string
}

export interface MemberPaymentView {
  entity: MemberPayment
  reversed: boolean
  // Método real usado no pagamento (mora na transação de caixa vinculada,
  // nunca null — ver GET /orgs/:orgId/members/:userId/payments no backend).
  paymentMethod: PaymentMethod
}

export interface MemberPaymentSummary {
  accruedCommissionCents: number
  paidNetCents: number
  balanceDueCents: number
}
