import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import { computeSlaDueDates } from "../../domain/ticket-sla";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketCategoryInvalidException } from "../../domain/exceptions/ticket-category-invalid.exception";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketCategoryRepository,
  TICKET_CATEGORY_REPOSITORY,
} from "../../domain/ticket-category.repository.interface";
import { SupportNotificationService } from "../support-notification.service";

export interface ReopenTicketInput {
  orgId: string;
  ticketId: string;
}

@Injectable()
export class ReopenTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_CATEGORY_REPOSITORY)
    private readonly ticketCategoryRepo: ITicketCategoryRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(data: ReopenTicketInput): Promise<TicketEntity> {
    const ticket = await this.ticketRepo.findByIdInOrg(
      data.ticketId,
      data.orgId,
    );
    if (!ticket) {
      throw new TicketNotFoundException(data.ticketId);
    }

    // A categoria já foi validada na criação do ticket (categoryId é uma FK
    // estável); se não for mais encontrada, é um caso de integridade de
    // dados, não de input do usuário — tratamos como erro em vez de
    // silenciosamente reabrir com um prazo de SLA obsoleto.
    const category = await this.ticketCategoryRepo.findById(ticket.categoryId);
    if (!category) {
      throw new TicketCategoryInvalidException(ticket.categoryId);
    }

    const now = new Date();
    const { slaResolutionDueAt } = computeSlaDueDates(now, category);

    const reopened = ticket
      .reopen(now)
      .resetResolutionSla(slaResolutionDueAt, now);
    const persisted = await this.ticketRepo.updateAsAdmin(reopened);

    await this.notifications.notifyReopened(persisted);

    return persisted;
  }
}
