import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketNotReopenableException } from "../../domain/exceptions/ticket-not-reopenable.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketResponseRepository,
  TICKET_RESPONSE_REPOSITORY,
} from "../../domain/ticket-response.repository.interface";

export interface AddCustomerResponseInput {
  orgId: string;
  ticketId: string;
  userId: string;
  body: string;
}

@Injectable()
export class AddCustomerResponseUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_RESPONSE_REPOSITORY)
    private readonly ticketResponseRepo: ITicketResponseRepository,
  ) {}

  async execute(data: AddCustomerResponseInput): Promise<TicketResponseEntity> {
    const ticket = await this.ticketRepo.findByIdInOrg(
      data.ticketId,
      data.orgId,
    );
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    // Ticket "resolved"/"closed" exige reabertura explícita antes de aceitar
    // nova resposta do cliente — sem essa checagem, a mensagem fica
    // "perdida" (ticket permanece resolvido/fechado, ninguém é notificado).
    // Reaproveita TicketNotReopenableException: o código HTTP (409) e a
    // ação esperada do cliente (reabrir o chamado) são os mesmos, mesmo que
    // a mensagem fale de "reopen" em vez de "responder".
    if (ticket.status === "resolved" || ticket.status === "closed") {
      throw new TicketNotReopenableException(ticket.id, ticket.status);
    }

    const response = TicketResponseEntity.create({
      id: randomUUID(),
      ticketId: ticket.id,
      orgId: data.orgId,
      authorType: "customer",
      authorUserId: data.userId,
      body: data.body,
      isInternalNote: false,
      createdAt: new Date(),
    });

    const created = await this.ticketResponseRepo.createAsAdmin(response);

    // Se o ticket estava aguardando o cliente, a resposta dele devolve a
    // bola para o agente: transiciona para "in_progress" para a fila admin
    // refletir isso.
    if (ticket.status === "waiting_customer") {
      await this.ticketRepo.updateAsAdmin(ticket.markInProgress());
    }

    return created;
  }
}
