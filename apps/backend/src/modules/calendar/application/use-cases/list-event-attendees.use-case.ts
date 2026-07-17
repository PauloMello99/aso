import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventNotFoundException } from "../../domain/exceptions/event-not-found.exception";
import { EventNotSharedException } from "../../domain/exceptions/event-not-shared.exception";

export interface ListEventAttendeesInput {
  orgId: string;
  authId: string;
  eventId: string;
}

export interface EventAttendeeRoster {
  userId: string;
  name: string;
  status: "going" | "not_going" | "pending";
}

@Injectable()
export class ListEventAttendeesUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
  ) {}

  async execute(input: ListEventAttendeesInput): Promise<EventAttendeeRoster[]> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    const event = await this.repo.findById(input.eventId, input.orgId);
    if (!event) throw new EventNotFoundException(input.eventId);

    if (event.visibility !== "shared") {
      throw new EventNotSharedException();
    }

    const [members, attendees] = await Promise.all([
      this.repo.listOrgMembersBasic(input.orgId),
      this.repo.listAttendees(input.eventId),
    ]);

    const statusByUserId = new Map(attendees.map((a) => [a.userId, a.status]));

    return members.map((member) => ({
      userId: member.userId,
      name: member.name,
      status: statusByUserId.get(member.userId) ?? "pending",
    }));
  }
}
