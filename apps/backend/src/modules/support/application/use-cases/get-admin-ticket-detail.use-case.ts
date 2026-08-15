import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
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
import {
  ITicketAttachmentRepository,
  TICKET_ATTACHMENT_REPOSITORY,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";

export interface GetAdminTicketDetailInput {
  ticketId: string;
}

export interface GetAdminTicketDetailResult {
  ticket: TicketEntity;
  responses: TicketResponseEntity[];
  attachments: TicketAttachmentRecord[];
}

@Injectable()
export class GetAdminTicketDetailUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_RESPONSE_REPOSITORY)
    private readonly ticketResponseRepo: ITicketResponseRepository,
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly ticketAttachmentRepo: ITicketAttachmentRepository,
  ) {}

  async execute(
    data: GetAdminTicketDetailInput,
  ): Promise<GetAdminTicketDetailResult> {
    const ticket = await this.ticketRepo.findByIdAsAdmin(data.ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    // Fila admin vê notas internas — diferente do portal do cliente.
    const [responses, attachments] = await Promise.all([
      this.ticketResponseRepo.listByTicketAsAdmin(ticket.id, true),
      this.ticketAttachmentRepo.listByTicketAsAdmin(ticket.id),
    ]);

    return { ticket, responses, attachments };
  }
}
