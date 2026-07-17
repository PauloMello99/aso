import { Inject, Injectable } from "@nestjs/common";
import { CalendarEventEntity } from "../../domain/calendar-event.entity";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";

export interface ListCalendarEventsInput {
  orgId: string;
  authId: string;
  start: Date;
  end: Date;
  /** users.id — filtro de membro (respeitado apenas para owner/admin). */
  assignedTo?: string;
}

@Injectable()
export class ListCalendarEventsUseCase {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
  ) {}

  async execute(input: ListCalendarEventsInput): Promise<CalendarEventEntity[]> {
    const membership = await this.repo.getMembership(input.orgId, input.authId);
    if (!membership) throw new EventForbiddenException();

    // Owner: todos, ou filtrado por membro (assignedTo do input).
    // Funcionário: ignora o assignedTo do input (privilégio de owner) e vê os
    // próprios eventos (qualquer visibility) + os shared de qualquer membro —
    // nunca os privados de terceiros (filtro obrigatório em aplicação; a RLS
    // do banco só isola por tenant, não por private/shared).
    if (membership.role === "owner") {
      return this.repo.findInRange(input.orgId, {
        start: input.start,
        end: input.end,
        assignedTo: input.assignedTo,
      });
    }

    return this.repo.findInRange(input.orgId, {
      start: input.start,
      end: input.end,
      includeSharedForUserId: membership.userId,
    });
  }
}
