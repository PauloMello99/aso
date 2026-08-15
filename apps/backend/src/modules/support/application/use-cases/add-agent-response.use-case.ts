import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketResponseRepository,
  TICKET_RESPONSE_REPOSITORY,
} from "../../domain/ticket-response.repository.interface";
import { SupportNotificationService } from "../support-notification.service";

export interface AddAgentResponseInput {
  ticketId: string;
  agentUserId: string;
  body: string;
  isInternalNote: boolean;
}

@Injectable()
export class AddAgentResponseUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_RESPONSE_REPOSITORY)
    private readonly ticketResponseRepo: ITicketResponseRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(data: AddAgentResponseInput): Promise<TicketResponseEntity> {
    const ticket = await this.ticketRepo.findByIdAsAdmin(data.ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    const response = TicketResponseEntity.create({
      id: randomUUID(),
      ticketId: ticket.id,
      orgId: ticket.orgId,
      authorType: "agent",
      authorUserId: data.agentUserId,
      body: data.body,
      isInternalNote: data.isInternalNote,
      createdAt: new Date(),
    });

    const created = await this.ticketResponseRepo.createAsAdmin(response);

    // Notas internas (isInternalNote=true) não contam como resposta ao
    // cliente para efeito de SLA de primeira resposta.
    if (!data.isInternalNote && !ticket.firstResponseAt) {
      await this.ticketRepo.updateAsAdmin(ticket.markFirstResponse());
    }

    await this.notifications.notifyAgentResponseAdded(ticket, created);

    return created;
  }
}
