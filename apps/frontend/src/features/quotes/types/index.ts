export interface QuoteRequestListItem {
  id: string
  targetUserId: string
  targetDisplayName: string | null
  requesterName: string
  ideaPreview: string
  status: string
  imageCount: number
  createdAt: string
  expiresAt: string
  viewed: boolean
}

export interface QuoteRequestsPage {
  items: QuoteRequestListItem[]
  page: number
  limit: number
  total: number
  pages: number
}

export interface QuoteRequestImage {
  id: string
  position: number
  contentType: string
  /** false para HEIC/HEIF: nunca renderizar <img>, só oferecer download. */
  previewable: boolean
  url: string | null
  downloadUrl: string | null
}

export interface QuoteRequestDetail {
  id: string
  targetUserId: string
  targetDisplayName: string | null
  requesterName: string
  requesterPhone: string
  requesterEmail: string
  idea: string
  status: string
  createdAt: string
  expiresAt: string
  viewed: boolean
  contactRetentionAccepted: boolean
  images: QuoteRequestImage[]
  imagesUnavailable: boolean
}

export interface UnreadQuoteCount {
  unread: number
}
