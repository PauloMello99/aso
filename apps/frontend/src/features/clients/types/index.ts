export type Gender = "male" | "female" | "other"

export interface Customer {
  id: string
  orgId: string
  userId: string | null
  originId: string | null
  createdBy: string | null
  name: string
  email: string
  phone: string | null
  birthDate: string
  gender: Gender | null
  address: string
  addressLine2: string | null
  number: string
  city: string
  state: string
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
  from?: string
  to?: string
  birthMonth?: number
  city?: string
  state?: string
}
