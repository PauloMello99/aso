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

export interface GetTicketDetailInput {
  orgId: string;
  ticketId: string;
}

export interface GetTicketDetailResult {
  ticket: TicketEntity;
  responses: TicketResponseEntity[];
  attachments: TicketAttachmentRecord[];
}

@Injectable()
export class GetTicketDetailUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_RESPONSE_REPOSITORY)
    private readonly ticketResponseRepo: ITicketResponseRepository,
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly ticketAttachmentRepo: ITicketAttachmentRepository,
  ) {}

  async execute(data: GetTicketDetailInput): Promise<GetTicketDetailResult> {
    const ticket = await this.ticketRepo.findByIdInOrg(
      data.ticketId,
      data.orgId,
    );
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    // Portal do cliente nunca vê nota interna.
    const [responses, attachments] = await Promise.all([
      this.ticketResponseRepo.listByTicketInOrg(ticket.id, data.orgId, false),
      this.ticketAttachmentRepo.listByTicketInOrg(ticket.id, data.orgId),
    ]);

    return { ticket, responses, attachments };
  }
}
