import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import { EventNotFoundException } from "../../domain/exceptions/event-not-found.exception";

export interface DeleteCalendarEventInput {
  id: string;
  orgId: string;
  authId: string;
}

@Injectable()
export class DeleteCalendarEventUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
  ) {}

  async execute(input: DeleteCalendarEventInput): Promise<void> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    const existing = await this.repo.findById(input.id, input.orgId);
    if (!existing) throw new EventNotFoundException(input.id);

    if (existing.assignedTo !== membership.userId) {
      throw new EventForbiddenException();
    }

    await this.repo.delete(input.id, input.orgId);
  }
}
