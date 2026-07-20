import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, isNull, lt, lte, ne, or, type SQL } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CalendarEventEntity,
  CreateCalendarEventData,
  UpdateCalendarEventData,
} from "../../domain/calendar-event.entity";
import type {
  AttendeeRow,
  DueReminder,
  ICalendarEventRepository,
  ListCalendarEventsFilter,
  OrgMembershipInfo,
  OrgOwner,
} from "../../domain/calendar-event.repository.interface";
import { CalendarEventMapper } from "./calendar-event.mapper";

@Injectable()
export class DrizzleCalendarEventRepository implements ICalendarEventRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async getMembership(
    orgId: string,
    authId: string,
  ): Promise<OrgMembershipInfo | null> {
    const [row] = await this.db
      .select({
        userId: schema.orgMemberships.userId,
        role: schema.orgMemberships.role,
        name: schema.users.name,
      })
      .from(schema.orgMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.orgMemberships.userId),
      )
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.users.authId, authId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async isOrgMember(orgId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schema.orgMemberships.id })
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.orgMemberships.userId, userId),
          eq(schema.orgMemberships.enabled, true),
        ),
      )
      .limit(1);
    return !!row;
  }

  async findOrgOwners(orgId: string): Promise<OrgOwner[]> {
    return this.admin
      .select({
        userId: schema.orgMemberships.userId,
        name: schema.users.name,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.orgMemberships.role, "owner"),
        ),
      );
  }

  async findById(id: string, orgId: string): Promise<CalendarEventEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.calendarEvents)
      .where(
        and(
          eq(schema.calendarEvents.id, id),
          eq(schema.calendarEvents.orgId, orgId),
        ),
      )
      .limit(1);
    return row ? CalendarEventMapper.toDomain(row) : null;
  }

  async findInRange(
    orgId: string,
    filter: ListCalendarEventsFilter,
  ): Promise<CalendarEventEntity[]> {
    const conditions: (SQL | undefined)[] = [
      eq(schema.calendarEvents.orgId, orgId),
      lt(schema.calendarEvents.startsAt, filter.end),
      gt(schema.calendarEvents.endsAt, filter.start),
    ];
    if (filter.assignedTo) {
      conditions.push(eq(schema.calendarEvents.assignedTo, filter.assignedTo));
    } else if (filter.includeSharedForUserId) {
      conditions.push(
        or(
          eq(schema.calendarEvents.assignedTo, filter.includeSharedForUserId),
          eq(schema.calendarEvents.visibility, "shared"),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(schema.calendarEvents)
      .where(and(...conditions))
      .orderBy(schema.calendarEvents.startsAt);

    return rows.map(CalendarEventMapper.toDomain);
  }

  async hasOverlap(
    assignedTo: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(schema.calendarEvents.assignedTo, assignedTo),
      lt(schema.calendarEvents.startsAt, end),
      gt(schema.calendarEvents.endsAt, start),
    ];
    if (excludeId) {
      conditions.push(ne(schema.calendarEvents.id, excludeId));
    }
    const [row] = await this.db
      .select({ id: schema.calendarEvents.id })
      .from(schema.calendarEvents)
      .where(and(...conditions))
      .limit(1);
    return !!row;
  }

  async create(data: CreateCalendarEventData): Promise<CalendarEventEntity> {
    const [row] = await this.db
      .insert(schema.calendarEvents)
      .values({
        orgId: data.orgId,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy ?? null,
        customerId: data.customerId ?? null,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay ?? false,
        visibility: data.visibility ?? "private",
      })
      .returning();
    return CalendarEventMapper.toDomain(row!);
  }

  async update(
    id: string,
    data: UpdateCalendarEventData,
  ): Promise<CalendarEventEntity> {
    const [row] = await this.db
      .update(schema.calendarEvents)
      .set({
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
        updatedAt: new Date(),
      })
      .where(eq(schema.calendarEvents.id, id))
      .returning();
    return CalendarEventMapper.toDomain(row!);
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.calendarEvents)
      .where(
        and(
          eq(schema.calendarEvents.id, id),
          eq(schema.calendarEvents.orgId, orgId),
        ),
      );
  }

  async findDueReminders(now: Date, until: Date): Promise<DueReminder[]> {
    return this.admin
      .select({
        id: schema.calendarEvents.id,
        orgId: schema.calendarEvents.orgId,
        assignedTo: schema.calendarEvents.assignedTo,
        title: schema.calendarEvents.title,
        startsAt: schema.calendarEvents.startsAt,
      })
      .from(schema.calendarEvents)
      .where(
        and(
          eq(schema.calendarEvents.type, "appointment"),
          eq(schema.calendarEvents.status, "scheduled"),
          isNull(schema.calendarEvents.reminderSentAt),
          gt(schema.calendarEvents.startsAt, now),
          lte(schema.calendarEvents.startsAt, until),
        ),
      )
      .orderBy(schema.calendarEvents.startsAt);
  }

  async markReminderSent(id: string): Promise<void> {
    await this.admin
      .update(schema.calendarEvents)
      .set({ reminderSentAt: new Date() })
      .where(eq(schema.calendarEvents.id, id));
  }

  async upsertAttendee(
    eventId: string,
    userId: string,
    status: "going" | "not_going",
  ): Promise<void> {
    await this.db
      .insert(schema.calendarEventAttendees)
      .values({ eventId, userId, status })
      .onConflictDoUpdate({
        target: [
          schema.calendarEventAttendees.eventId,
          schema.calendarEventAttendees.userId,
        ],
        set: { status, updatedAt: new Date() },
      });
  }

  async listAttendees(eventId: string): Promise<AttendeeRow[]> {
    return this.db
      .select({
        userId: schema.calendarEventAttendees.userId,
        name: schema.users.name,
        status: schema.calendarEventAttendees.status,
      })
      .from(schema.calendarEventAttendees)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.calendarEventAttendees.userId),
      )
      .where(eq(schema.calendarEventAttendees.eventId, eventId));
  }

  async listOrgMembersBasic(
    orgId: string,
  ): Promise<{ userId: string; name: string }[]> {
    return this.db
      .select({
        userId: schema.orgMemberships.userId,
        name: schema.users.name,
      })
      .from(schema.orgMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.orgMemberships.userId))
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.orgMemberships.enabled, true),
        ),
      );
  }
}
