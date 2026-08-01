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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventInvalidRangeException } from "../../domain/exceptions/event-invalid-range.exception";
import { EventOverlapException } from "../../domain/exceptions/event-overlap.exception";
import { NotificationService } from "../../../notifications/application/notification.service";

export interface CreateCalendarEventInput {
  orgId: string;
  authId: string;
  assignedTo?: string | null;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  customerId?: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
}

@Injectable()
export class CreateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
    private readonly notifications: NotificationService,
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
    });

    if (created.type === "unavailability") {
      await this.notifyOwnersOfUnavailability(input.orgId, membership.userId, membership.name, created.startsAt);
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
