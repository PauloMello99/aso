import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketAlreadyLinkedException } from "../../domain/exceptions/ticket-already-linked.exception";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";

export interface LinkTicketToOrganizationInput {
  ticketId: string;
  orgId: string;
}

/**
 * Vincula manualmente um ticket órfão (org_id NULL, criado via canal
 * público/e-mail inbound) a uma organização — fila admin (FC-15).
 *
 * TODO conhecido (débito aceito, registrado pelo database-guardian): os
 * anexos do ticket órfão nascem com `storage_path` prefixado por `orphan/`
 * (ver `HandleInboundEmailUseCase.persistAttachments`). Depois deste
 * vínculo, a coluna `ticket_attachments.org_id` passa a refletir a org
 * correta, mas o objeto no Storage continua fisicamente sob o prefixo
 * antigo `orphan/...` — mover os objetos no Storage fica para uma fatia
 * futura, não é esquecimento.
 */
@Injectable()
export class LinkTicketToOrganizationUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
  ) {}

  async execute(data: LinkTicketToOrganizationInput): Promise<TicketEntity> {
    const ticket = await this.ticketRepo.findByIdAsAdmin(data.ticketId);
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }
    if (ticket.orgId !== null) {
      // Checagem "otimista": evita a race condition "passou aqui, mas outra
      // request vinculou primeiro" ficar mascarada só pelo `AND org_id IS
      // NULL` do repositório. Se a corrida ocorrer mesmo assim (entre esta
      // checagem e o UPDATE), `ITicketRepository.linkToOrganization` lança a
      // mesma exceção como segunda camada de proteção.
      throw new TicketAlreadyLinkedException(data.ticketId);
    }

    const org = await this.ticketRepo.findOrgById(data.orgId);
    if (!org) {
      throw new OrgNotFoundException(data.orgId);
    }

    return this.ticketRepo.linkToOrganization(data.ticketId, data.orgId);
  }
}
