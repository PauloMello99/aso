import type { AnamnesisQuestion } from "@/features/anamnesis"

export type PublicFormStatus = "pending" | "submitted" | "expired"

export interface RegistrationAnamnesisForm {
  questions: AnamnesisQuestion[]
  consent: { version: string; text: string }
}

export interface CustomerRegistrationLookup {
  organizationName: string
  email: string
  serviceTypeName: string | null
  status: PublicFormStatus
  expiresAt: string
  anamnesisForm: RegistrationAnamnesisForm | null
}

export interface CustomerUpdateInvitationCustomerSnapshot {
  name: string
  email: string
  phone: string | null
  birthDate: string
  address: string
  number: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string | null
  country: string | null
}

export interface CustomerUpdateLookup {
  organizationName: string
  status: PublicFormStatus
  expiresAt: string
  customer: CustomerUpdateInvitationCustomerSnapshot
}
