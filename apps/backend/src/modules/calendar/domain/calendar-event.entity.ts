export type CalendarEventType = "appointment" | "unavailability";
export type CalendarEventStatus = "scheduled" | "canceled";
export type CalendarEventVisibility = "private" | "shared";

export type CalendarEventConfirmationStatus =
  | "pending"
  | "confirmed"
  | "canceled_by_customer";

export interface CalendarEventProps {
  id: string;
  orgId: string;
  assignedTo: string;
  customerId: string | null;
  createdBy: string | null;
  type: CalendarEventType;
  status: CalendarEventStatus;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  visibility: CalendarEventVisibility;
  customerEmail: string | null;
  confirmationStatus: CalendarEventConfirmationStatus | null;
  confirmationRequestedAt: Date | null;
  confirmationSentAt: Date | null;
  confirmationRespondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bloco de persistência do ciclo de confirmação. Cada campo aceita `null`
 * (limpa a coluna); `undefined` = não mexe. O hash do token e o carimbo do
 * lembrete ao cliente ficam fora da entity (nunca saem do backend).
 */
export interface CalendarEventConfirmationData {
  status?: CalendarEventConfirmationStatus | null;
  tokenHash?: string | null;
  requestedAt?: Date | null;
  sentAt?: Date | null;
  respondedAt?: Date | null;
  customerReminderSentAt?: Date | null;
}

export interface CreateCalendarEventData {
  orgId: string;
  assignedTo: string;
  createdBy?: string | null;
  customerId?: string | null;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
  customerEmail?: string | null;
  confirmation?: CalendarEventConfirmationData;
  /** Origem opaca (ex.: pedido de orçamento). Só gravação; não vai à entidade. */
  sourceQuoteRequestId?: string | null;
}

export interface UpdateCalendarEventData {
  customerId?: string | null;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  title?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
  customerEmail?: string | null;
  confirmation?: CalendarEventConfirmationData;
}

export class CalendarEventEntity {
  readonly id: string;
  readonly orgId: string;
  readonly assignedTo: string;
  readonly customerId: string | null;
  readonly createdBy: string | null;
  readonly type: CalendarEventType;
  readonly status: CalendarEventStatus;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly allDay: boolean;
  readonly visibility: CalendarEventVisibility;
  readonly customerEmail: string | null;
  readonly confirmationStatus: CalendarEventConfirmationStatus | null;
  readonly confirmationRequestedAt: Date | null;
  readonly confirmationSentAt: Date | null;
  readonly confirmationRespondedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CalendarEventProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.assignedTo = props.assignedTo;
    this.customerId = props.customerId;
    this.createdBy = props.createdBy;
    this.type = props.type;
    this.status = props.status;
    this.title = props.title;
    this.description = props.description;
    this.startsAt = props.startsAt;
    this.endsAt = props.endsAt;
    this.allDay = props.allDay;
    this.visibility = props.visibility;
    this.customerEmail = props.customerEmail;
    this.confirmationStatus = props.confirmationStatus;
    this.confirmationRequestedAt = props.confirmationRequestedAt;
    this.confirmationSentAt = props.confirmationSentAt;
    this.confirmationRespondedAt = props.confirmationRespondedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CalendarEventProps): CalendarEventEntity {
    return new CalendarEventEntity(props);
  }

  /** Cópia sem o e-mail do cliente nem o estado de confirmação (PII para quem não é dono do evento). */
  withoutCustomerEmail(): CalendarEventEntity {
    return new CalendarEventEntity({
      ...this,
      customerEmail: null,
      confirmationStatus: null,
      confirmationRequestedAt: null,
      confirmationSentAt: null,
      confirmationRespondedAt: null,
    });
  }
}
