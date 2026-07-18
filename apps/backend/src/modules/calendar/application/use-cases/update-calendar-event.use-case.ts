import { Inject, Injectable } from "@nestjs/common";
import {
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

export interface UpdateCalendarEventInput {
  id: string;
  orgId: string;
  authId: string;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  title?: string;
  description?: string | null;
  customerId?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  allDay?: boolean;
  visibility?: CalendarEventVisibility;
}

@Injectable()
export class UpdateCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
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

    return this.repo.update(input.id, {
      type: input.type,
      status: input.status,
      title: input.title,
      description: input.description,
      customerId: input.customerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay,
      visibility: input.visibility,
    });
  }
}
