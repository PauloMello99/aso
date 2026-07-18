export type CalendarEventType = "appointment" | "unavailability";
export type CalendarEventStatus = "scheduled" | "canceled";
export type CalendarEventVisibility = "private" | "shared";

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
  createdAt: Date;
  updatedAt: Date;
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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CalendarEventProps): CalendarEventEntity {
    return new CalendarEventEntity(props);
  }
}
