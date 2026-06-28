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
  /** users.id — restringe a um membro específico (usado por owner/admin). */
  assignedTo?: string;
}

export interface ICalendarEventRepository {
  /** Resolve a membership do usuário (por auth_id) na org → { userId, role, name }. */
  getMembership(orgId: string, authId: string): Promise<OrgMembershipInfo | null>;

  /** True se `userId` é membro ativo da org (valida o "em nome de" do owner). */
  isOrgMember(orgId: string, userId: string): Promise<boolean>;

  /** Owners (admins) da org — para notificar sobre indisponibilidade. */
  findOrgOwners(orgId: string): Promise<OrgOwner[]>;

  findById(id: string, orgId: string): Promise<CalendarEventEntity | null>;

  findInRange(
    orgId: string,
    filter: ListCalendarEventsFilter,
  ): Promise<CalendarEventEntity[]>;

  /** True se há evento do mesmo membro sobrepondo [start, end), exceto excludeId. */
  hasOverlap(
    assignedTo: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<boolean>;

  create(data: CreateCalendarEventData): Promise<CalendarEventEntity>;
  update(id: string, data: UpdateCalendarEventData): Promise<CalendarEventEntity>;
  delete(id: string, orgId: string): Promise<void>;

  /** Agendamentos (scheduled) que começam em (now, until] e ainda não foram lembrados. */
  findDueReminders(now: Date, until: Date): Promise<DueReminder[]>;
  markReminderSent(id: string): Promise<void>;
}
