import {
  CalendarEventEntity,
  CreateCalendarEventData,
  UpdateCalendarEventData,
} from "./calendar-event.entity";

export const CALENDAR_EVENT_REPOSITORY = Symbol("CALENDAR_EVENT_REPOSITORY");

export interface OrgMembershipInfo {
  userId: string;
  role: "owner" | "employee";
  name: string;
}

export interface OrgOwner {
  userId: string;
  name: string;
}

export interface DueReminder {
  id: string;
  orgId: string;
  assignedTo: string;
  title: string;
  startsAt: Date;
}

export interface ListCalendarEventsFilter {
  start: Date;
  end: Date;
  assignedTo?: string;
  includeSharedForUserId?: string;
}

export interface AttendeeRow {
  userId: string;
  name: string;
  status: "going" | "not_going";
}

export interface ICalendarEventRepository {
  getMembership(orgId: string, authId: string): Promise<OrgMembershipInfo | null>;

  isOrgMember(orgId: string, userId: string): Promise<boolean>;

  findOrgOwners(orgId: string): Promise<OrgOwner[]>;

  findById(id: string, orgId: string): Promise<CalendarEventEntity | null>;

  findInRange(
    orgId: string,
    filter: ListCalendarEventsFilter,
  ): Promise<CalendarEventEntity[]>;

  hasOverlap(
    assignedTo: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<boolean>;

  create(data: CreateCalendarEventData): Promise<CalendarEventEntity>;
  update(id: string, data: UpdateCalendarEventData): Promise<CalendarEventEntity>;
  delete(id: string, orgId: string): Promise<void>;

  findDueReminders(now: Date, until: Date): Promise<DueReminder[]>;
  markReminderSent(id: string): Promise<void>;

  upsertAttendee(
    eventId: string,
    userId: string,
    status: "going" | "not_going",
  ): Promise<void>;

  listAttendees(eventId: string): Promise<AttendeeRow[]>;

  listOrgMembersBasic(orgId: string): Promise<{ userId: string; name: string }[]>;
}
