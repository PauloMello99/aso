import { Inject, Injectable } from "@nestjs/common";
import {
  CalendarEventConfirmationData,
  CalendarEventEntity,
  CalendarEventStatus,
  CalendarEventType,
  CalendarEventVisibility,
} from "../../domain/calendar-event.entity";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventInvalidRangeException } from "../../domain/exceptions/event-invalid-range.exception";
import { EventNotFoundException } from "../../domain/exceptions/event-not-found.exception";
import { EventOverlapException } from "../../domain/exceptions/event-overlap.exception";
import {
  normalizeCustomerEmail,
  planConfirmationChange,
} from "../../domain/plan-confirmation-change";
import {
  AppointmentConfirmationDispatcher,
  type ConfirmationCycle,
} from "../appointment-confirmation-dispatcher";

export interface UpdateCalendarEventInput {
  id: string;
  orgId: string;
  authId: string;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  title?: string;
  description?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
}

const CLEARED_CONFIRMATION: CalendarEventConfirmationData = {
  status: null,
  tokenHash: null,
  requestedAt: null,
  sentAt: null,
  respondedAt: null,
  customerReminderSentAt: null,
};

@Injectable()
export class UpdateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
    private readonly confirmation: AppointmentConfirmationDispatcher,
  ) {}

  async execute(input: UpdateCalendarEventInput): Promise<CalendarEventEntity> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    const existing = await this.repo.findById(input.id, input.orgId);
    if (!existing) throw new EventNotFoundException(input.id);

    if (existing.assignedTo !== membership.userId) {
      throw new EventForbiddenException();
    }

    const startsAt = input.startsAt ?? existing.startsAt;
    const endsAt = input.endsAt ?? existing.endsAt;
    if (endsAt <= startsAt) throw new EventInvalidRangeException();

    if (
      (input.startsAt !== undefined || input.endsAt !== undefined) &&
      (await this.repo.hasOverlap(
        existing.assignedTo,
        startsAt,
        endsAt,
        existing.id,
      ))
    ) {
      throw new EventOverlapException();
    }

    const nextType = input.type ?? existing.type;
    const nextEmail =
      nextType !== "appointment"
        ? null
        : input.customerEmail !== undefined
          ? normalizeCustomerEmail(input.customerEmail)
          : existing.customerEmail;
    const now = new Date();
    const plan = planConfirmationChange(
      existing,
      {
        type: nextType,
        status: input.status ?? existing.status,
        startsAt,
        customerEmail: nextEmail,
      },
      now,
    );

    let cycle: ConfirmationCycle | null = null;
    let customerEmail: string | null | undefined;
    let confirmation: CalendarEventConfirmationData | undefined;
    if (plan === "clear") {
      customerEmail = null;
      confirmation = CLEARED_CONFIRMATION;
    } else {
      if (input.customerEmail !== undefined || nextType !== "appointment") {
        customerEmail = nextEmail;
      }
      if (plan === "start_cycle") {
        if (this.confirmation.isEnabled()) {
          cycle = this.confirmation.buildCycle(now);
          confirmation = cycle.confirmation;
        } else {
          // Flag desligada: não deixa token/status do ciclo antigo vivos para
          // um horário/e-mail que mudou.
          confirmation = CLEARED_CONFIRMATION;
        }
      }
    }

    const updated = await this.repo.update(input.id, {
      type: input.type,
      status: input.status,
      title: input.title,
      description: input.description,
      customerId: input.customerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay,
      visibility: input.visibility,
      customerEmail,
      confirmation,
    });

    // O envio só acontece DEPOIS do COMMIT (hook do dispatcher, que relê o
    // evento e a org por hash); nada de e-mail nem leitura extra no request.
    if (cycle) {
      this.confirmation.scheduleConfirmation(updated.id, cycle.token);
    }

    return updated;
  }
}
