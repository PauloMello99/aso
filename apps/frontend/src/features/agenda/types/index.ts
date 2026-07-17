export type CalendarEventType = "appointment" | "unavailability"
export type CalendarEventStatus = "scheduled" | "canceled"
export type CalendarEventVisibility = "private" | "shared"

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
  visibility: CalendarEventVisibility
  createdAt: string
  updatedAt: string
}

export type CalendarView = "day" | "week" | "month"

export type AttendeeStatus = "going" | "not_going" | "pending"

export interface Attendee {
  userId: string
  name: string
  status: AttendeeStatus
}
