export type CalendarEventType = "appointment" | "unavailability"
export type CalendarEventStatus = "scheduled" | "canceled"
export type CalendarEventVisibility = "private" | "shared"
export type CalendarEventConfirmationStatus =
  | "pending"
  | "confirmed"
  | "canceled_by_customer"

export type AppointmentConfirmationResponse = "confirmed" | "canceled_by_customer"

export interface PublicAppointmentConfirmation {
  orgName: string
  startsAt: string
  endsAt: string
  allDay: boolean
  confirmationStatus: CalendarEventConfirmationStatus
  state: "open" | "event_canceled"
}

export interface CalendarEvent {
  id: string
  orgId: string
  assignedTo: string
  customerId: string | null
  createdBy: string | null
  type: CalendarEventType
  status: CalendarEventStatus
  title: string
  description: string | null
  startsAt: string
  endsAt: string
  allDay: boolean
  visibility: CalendarEventVisibility
  customerEmail: string | null
  confirmationStatus: CalendarEventConfirmationStatus | null
  confirmationRequestedAt: string | null
  confirmationSentAt: string | null
  confirmationRespondedAt: string | null
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
