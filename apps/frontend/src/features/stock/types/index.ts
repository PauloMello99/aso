export interface MaterialCategory {
  id: string
  orgId: string
  name: string
  createdAt: string
}

export interface Material {
  id: string
  orgId: string
  categoryId: string | null
  name: string
  stockQuantity: string
  minimumQuantity: string
  costPerUnit: string | null
  shareable: boolean
  lastUsedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type StockMovementType =
  | "restock"
  | "service_consumption"
  | "manual_adjustment"

export interface StockMovement {
  id: string
  orgId: string
  materialId: string
  type: StockMovementType
  quantityDelta: string
  serviceId: string | null
  note: string | null
  createdBy: string | null
  createdAt: string
}

export interface MaterialsFilter {
  categoryId?: string
  lowStockOnly?: boolean
  name?: string
  archived?: boolean
  shareable?: boolean
  /** Custo unitário (reais, string decimal). */
  minCost?: string
  maxCost?: string
}
