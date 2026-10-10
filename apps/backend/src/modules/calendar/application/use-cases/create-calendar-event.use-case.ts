import { Inject, Injectable } from "@nestjs/common";
import {
  CalendarEventEntity,
  CalendarEventType,
  CalendarEventVisibility,
} from "../../domain/calendar-event.entity";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import {
  normalizeCustomerEmail,
  planConfirmationChange,
} from "../../domain/plan-confirmation-change";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventInvalidRangeException } from "../../domain/exceptions/event-invalid-range.exception";
import { EventOverlapException } from "../../domain/exceptions/event-overlap.exception";
import { NotificationService } from "../../../notifications/application/notification.service";
import {
  AppointmentConfirmationDispatcher,
  type ConfirmationCycle,
} from "../appointment-confirmation-dispatcher";

export interface CreateCalendarEventInput {
  orgId: string;
  authId: string;
  assignedTo?: string | null;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
  /** Só uso interno (ex.: QuotesModule); nunca vindo de DTO HTTP. */
  sourceQuoteRequestId?: string | null;
}

@Injectable()
export class CreateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
    private readonly notifications: NotificationService,
    private readonly confirmation: AppointmentConfirmationDispatcher,
  ) {}

  async execute(input: CreateCalendarEventInput): Promise<CalendarEventEntity> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    if (input.endsAt <= input.startsAt) {
      throw new EventInvalidRangeException();
    }

    let assignedTo = membership.userId;
    if (
      membership.role === "owner" &&
      input.assignedTo &&
      input.assignedTo !== membership.userId
    ) {
      if (!(await this.repo.isOrgMember(input.orgId, input.assignedTo))) {
        throw new EventForbiddenException();
      }
      assignedTo = input.assignedTo;
    }

    if (await this.repo.hasOverlap(assignedTo, input.startsAt, input.endsAt)) {
      throw new EventOverlapException();
    }

    const customerEmail =
      input.type === "appointment"
        ? normalizeCustomerEmail(input.customerEmail)
        : null;
    const now = new Date();
    const plan = planConfirmationChange(
      null,
      {
        type: input.type,
        status: "scheduled",
        startsAt: input.startsAt,
        customerEmail,
      },
      now,
    );
    const cycle: ConfirmationCycle | null =
      plan === "start_cycle" && this.confirmation.isEnabled()
        ? this.confirmation.buildCycle(now)
        : null;

    const created = await this.repo.create({
      orgId: input.orgId,
      assignedTo,
      createdBy: membership.userId,
      customerId: input.type === "appointment" ? (input.customerId ?? null) : null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay ?? false,
      visibility: input.visibility ?? "private",
      customerEmail,
      sourceQuoteRequestId: input.sourceQuoteRequestId ?? null,
      ...(cycle && { confirmation: cycle.confirmation }),
    });

    if (created.type === "unavailability") {
      await this.notifyOwnersOfUnavailability(input.orgId, membership.userId, membership.name, created.startsAt);
    }

    // O envio só acontece DEPOIS do COMMIT (hook do dispatcher, que relê o
    // evento e a org por hash); nada de e-mail nem leitura extra no request.
    if (cycle) {
      this.confirmation.scheduleConfirmation(created.id, cycle.token);
    }

    return created;
  }

  private async notifyOwnersOfUnavailability(
    orgId: string,
    actorUserId: string,
    actorName: string,
    startsAt: Date,
  ): Promise<void> {
    const owners = await this.repo.findOrgOwners(orgId);
    const when = format(startsAt, "dd/MM 'às' HH:mm", { locale: ptBR });
    await Promise.all(
      owners
        .filter((o) => o.userId !== actorUserId)
        .map((o) =>
          this.notifications.notify({
            userId: o.userId,
            orgId,
            type: "member_unavailability",
            title: `${actorName} sinalizou indisponibilidade`,
            body: `Indisponibilidade marcada para ${when}.`,
          }),
        ),
    );
  }
}
