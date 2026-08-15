import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";

export interface AssignTicketInput {
  ticketId: string;
  agentUserId: string;
}

/**
 * Atribui um agente ao ticket (fila admin, cross-org). Se o ticket ainda
 * estiver "open", a atribuição também o move para "in_progress" — assumir
 * um chamado inicia o atendimento. Em qualquer outro status, o status atual
 * é preservado e só assignedAgentId é atualizado (reatribuir um ticket já
 * em andamento/aguardando cliente/resolvido não deve regredir o fluxo).
 */
@Injectable()
export class AssignTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
  ) {}

  async execute(data: AssignTicketInput): Promise<TicketEntity> {
    const ticket = await this.ticketRepo.findByIdAsAdmin(data.ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    const now = new Date();
    const transitioned =
      ticket.status === "open" ? ticket.markInProgress(now) : ticket;
    const assigned = transitioned.assignAgent(data.agentUserId, now);

    return this.ticketRepo.updateAsAdmin(assigned);
  }
}
