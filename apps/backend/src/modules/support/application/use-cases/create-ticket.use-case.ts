import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity, TicketPriority } from "../../domain/ticket.entity";
import { computeSlaDueDates } from "../../domain/ticket-sla";
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

export interface CreateTicketInput {
  orgId: string;
  createdBy: string | null;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  categorySystemKey: string;
  priority?: TicketPriority;
}

@Injectable()
export class CreateTicketUseCase {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_CATEGORY_REPOSITORY)
    private readonly ticketCategoryRepo: ITicketCategoryRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(data: CreateTicketInput): Promise<TicketEntity> {
    // A interface do repositório só expõe `findById` (não há lookup por
    // system_key) e `listEnabled()` já filtra as categorias desabilitadas,
    // então "não encontrada" e "desabilitada" colapsam na mesma exceção
    // sem precisar de infra nova nem de resolução na camada de interface.
    const categories = await this.ticketCategoryRepo.listEnabled();
    const category = categories.find(
      (c) => c.systemKey === data.categorySystemKey,
    );
    if (!category) {
      throw new TicketCategoryInvalidException(data.categorySystemKey);
    }

    const now = new Date();
    const { slaFirstResponseDueAt, slaResolutionDueAt } = computeSlaDueDates(
      now,
      category,
    );

    const ticket = TicketEntity.create({
      id: randomUUID(),
      orgId: data.orgId,
      categoryId: category.id,
      createdBy: data.createdBy,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      slaFirstResponseDueAt,
      slaResolutionDueAt,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.ticketRepo.createAsAdmin(ticket);
    await this.notifications.notifyTicketCreated(created);
    return created;
  }
}
