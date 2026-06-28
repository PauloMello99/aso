export type CalendarEventType = "appointment" | "unavailability"
export type CalendarEventStatus = "scheduled" | "canceled"

export interface CalendarEvent {
  id: string
  orgId: string
  assignedTo: string // users.id do membro
  customerId: string | null
  createdBy: string | null
  type: CalendarEventType
  status: CalendarEventStatus
  title: string
  description: string | null
  startsAt: string // ISO
  endsAt: string // ISO
  allDay: boolean
  createdAt: string
  updatedAt: string
}

export type CalendarView = "day" | "week" | "month"
