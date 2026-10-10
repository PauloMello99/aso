import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, isNotNull, isNull, lte, sql } from "drizzle-orm";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  AppointmentConfirmationResponse,
  AppointmentConfirmationView,
  DueCustomerReminder,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import { CalendarEventMapper } from "./calendar-event.mapper";

// Conexão administrativa de propósito (exceção deliberada, ADR-0021): os dois
// chamadores NÃO têm sessão/request.user — o cron e a página pública do cliente
// (autorizada apenas pela posse do token, comparado por hash). A org nunca vem
// do cliente: toda leitura/escrita é filtrada pelo hash do token ou pelo id do
// evento obtido no próprio backend.
@Injectable()
export class DrizzleAppointmentConfirmationRepository
  implements IAppointmentConfirmationRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB) {}

  async findDueCustomerReminders(
    now: Date,
    until: Date,
    limit: number,
  ): Promise<DueCustomerReminder[]> {
    const rows = await this.admin
      .select({
        event: schema.calendarEvents,
        orgName: schema.organizations.name,
      })
      .from(schema.calendarEvents)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.calendarEvents.orgId),
      )
      .where(
        and(
          eq(schema.calendarEvents.confirmationStatus, "pending"),
          eq(schema.calendarEvents.status, "scheduled"),
          isNotNull(schema.calendarEvents.customerEmail),
          isNull(schema.calendarEvents.customerReminderSentAt),
          gt(schema.calendarEvents.startsAt, now),
          lte(schema.calendarEvents.startsAt, until),
          sql`${schema.calendarEvents.confirmationRequestedAt} <= ${schema.calendarEvents.startsAt} - interval '24 hours'`,
        ),
      )
      .orderBy(schema.calendarEvents.startsAt)
      .limit(limit);

    return rows.flatMap((r) =>
      r.event.confirmationRequestedAt
        ? [
            {
              event: CalendarEventMapper.toDomain(r.event),
              orgName: r.orgName,
              requestedAt: r.event.confirmationRequestedAt,
            },
          ]
        : [],
    );
  }

  async claimCustomerReminder(
    id: string,
    now: Date,
    until: Date,
    expectedRequestedAt: Date,
  ): Promise<boolean> {
    const rows = await this.admin
      .update(schema.calendarEvents)
      .set({ customerReminderSentAt: now })
      .where(
        and(
          eq(schema.calendarEvents.id, id),
          isNull(schema.calendarEvents.customerReminderSentAt),
          eq(schema.calendarEvents.confirmationStatus, "pending"),
          eq(schema.calendarEvents.status, "scheduled"),
          gt(schema.calendarEvents.startsAt, now),
          lte(schema.calendarEvents.startsAt, until),
          eq(schema.calendarEvents.confirmationRequestedAt, expectedRequestedAt),
          sql`${schema.calendarEvents.confirmationRequestedAt} <= ${schema.calendarEvents.startsAt} - interval '24 hours'`,
        ),
      )
      .returning({ id: schema.calendarEvents.id });
    return rows.length > 0;
  }

  async storeReminderToken(
    id: string,
    tokenHash: string,
    claimedAt: Date,
    sentAt: Date,
  ): Promise<boolean> {
    const rows = await this.admin
      .update(schema.calendarEvents)
      .set({ confirmationTokenHash: tokenHash, confirmationSentAt: sentAt })
      .where(
        and(
          eq(schema.calendarEvents.id, id),
          eq(schema.calendarEvents.confirmationStatus, "pending"),
          eq(schema.calendarEvents.status, "scheduled"),
          eq(schema.calendarEvents.customerReminderSentAt, claimedAt),
        ),
      )
      .returning({ id: schema.calendarEvents.id });
    return rows.length > 0;
  }

  async releaseCustomerReminder(id: string, claimedAt: Date): Promise<void> {
    await this.admin
      .update(schema.calendarEvents)
      .set({ customerReminderSentAt: null })
      .where(
        and(
          eq(schema.calendarEvents.id, id),
          eq(schema.calendarEvents.customerReminderSentAt, claimedAt),
        ),
      );
  }

  async markConfirmationSentByHash(
    eventId: string,
    tokenHash: string,
    sentAt: Date,
  ): Promise<void> {
    await this.admin
      .update(schema.calendarEvents)
      .set({ confirmationSentAt: sentAt })
      .where(
        and(
          eq(schema.calendarEvents.id, eventId),
          eq(schema.calendarEvents.confirmationTokenHash, tokenHash),
        ),
      );
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<AppointmentConfirmationView | null> {
    const [row] = await this.admin
      .select({
        event: schema.calendarEvents,
        orgName: schema.organizations.name,
      })
      .from(schema.calendarEvents)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.calendarEvents.orgId),
      )
      .where(eq(schema.calendarEvents.confirmationTokenHash, tokenHash))
      .limit(1);
    if (!row) return null;
    return {
      event: CalendarEventMapper.toDomain(row.event),
      orgName: row.orgName,
    };
  }

  async recordResponse(
    eventId: string,
    tokenHash: string,
    response: AppointmentConfirmationResponse,
    now: Date,
  ): Promise<boolean> {
    const rows = await this.admin
      .update(schema.calendarEvents)
      .set({ confirmationStatus: response, confirmationRespondedAt: now })
      .where(
        and(
          eq(schema.calendarEvents.id, eventId),
          eq(schema.calendarEvents.confirmationTokenHash, tokenHash),
          eq(schema.calendarEvents.status, "scheduled"),
          gt(schema.calendarEvents.startsAt, now),
          sql`${schema.calendarEvents.confirmationStatus} IS DISTINCT FROM ${response}::calendar_event_confirmation_status`,
        ),
      )
      .returning({ id: schema.calendarEvents.id });
    return rows.length > 0;
  }
}
