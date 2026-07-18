import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventNotFoundException } from "../../domain/exceptions/event-not-found.exception";
import { EventNotSharedException } from "../../domain/exceptions/event-not-shared.exception";

export interface SetEventRsvpInput {
  orgId: string;
  authId: string;
  eventId: string;
  status: "going" | "not_going";
}

@Injectable()
export class SetEventRsvpUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
  ) {}

  async execute(input: SetEventRsvpInput): Promise<void> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    const event = await this.repo.findById(input.eventId, input.orgId);
    if (!event) throw new EventNotFoundException(input.eventId);

    if (event.visibility !== "shared") {
      throw new EventNotSharedException();
    }

    await this.repo.upsertAttendee(input.eventId, membership.userId, input.status);
  }
}
