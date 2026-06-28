export type NotificationType = "agenda_reminder" | "member_unavailability"

export interface AppNotification {
  id: string
  userId: string
  orgId: string | null
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationsResponse {
  items: AppNotification[]
  unread: number
}
