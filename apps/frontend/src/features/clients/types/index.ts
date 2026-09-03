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
  // number/city/state: nullable para clientes importados do legado Ink House.
  // O form (customerSchema) continua exigindo no cadastro e na edição.
  number: string | null
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
  from?: string
  to?: string
  birthMonth?: number
  city?: string
  state?: string
  page?: number
  limit?: number
}
