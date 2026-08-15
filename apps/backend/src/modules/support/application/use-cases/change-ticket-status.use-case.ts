import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity, TicketStatus } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import { SupportNotificationService } from "../support-notification.service";

export type ChangeableTicketStatus = Extract<
  TicketStatus,
  "in_progress" | "waiting_customer" | "resolved" | "closed"
>;

export interface ChangeTicketStatusInput {
  ticketId: string;
  targetStatus: ChangeableTicketStatus;
}

/**
 * Mapa de transição -> método da entidade. A validação de transição válida
 * (ex.: "closed" não pode ir para "in_progress") é feita pela própria
 * TicketEntity, que lança TicketInvalidTransitionException — o use-case só
 * propaga.
 */
const TRANSITIONS: Record<
  ChangeableTicketStatus,
  (ticket: TicketEntity) => TicketEntity
> = {
  in_progress: (ticket) => ticket.markInProgress(),
  waiting_customer: (ticket) => ticket.markWaitingCustomer(),
  resolved: (ticket) => ticket.markResolved(),
  closed: (ticket) => ticket.close(),
};

@Injectable()
export class ChangeTicketStatusUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(data: ChangeTicketStatusInput): Promise<TicketEntity> {
    const ticket = await this.ticketRepo.findByIdAsAdmin(data.ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    const previousStatus = ticket.status;
    const updated = TRANSITIONS[data.targetStatus](ticket);
    const persisted = await this.ticketRepo.updateAsAdmin(updated);

    await this.notifications.notifyStatusChanged(persisted, previousStatus);

    return persisted;
  }
}
