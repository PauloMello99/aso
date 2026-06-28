export type Gender = "male" | "female" | "other"

export interface Customer {
  id: string
  orgId: string
  userId: string | null
  originId: string | null
  createdBy: string | null
  name: string
  email: string | null
  phone: string | null
  birthDate: string | null
  gender: Gender | null
  address: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  notes: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomersFilter {
  search?: string
  enabledOnly?: boolean
  status?: "active" | "inactive"
  originId?: string
  gender?: Gender
  /** Faixa de data de cadastro (YYYY-MM-DD). */
  from?: string
  to?: string
}
