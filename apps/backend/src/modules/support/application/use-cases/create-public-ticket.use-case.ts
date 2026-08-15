import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { TicketEntity } from "../../domain/ticket.entity";
import { computeSlaDueDates } from "../../domain/ticket-sla";
import { TicketCategoryInvalidException } from "../../domain/exceptions/ticket-category-invalid.exception";
import { CaptchaVerificationFailedException } from "../../domain/exceptions/captcha-verification-failed.exception";
import {
  ICaptchaVerifier,
  CAPTCHA_VERIFIER,
} from "../../domain/ports/captcha-verifier.port";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketCategoryRepository,
  TICKET_CATEGORY_REPOSITORY,
} from "../../domain/ticket-category.repository.interface";
import { SupportNotificationService } from "../support-notification.service";

export interface CreatePublicTicketInput {
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  categorySystemKey: string;
  captchaToken: string;
  remoteIp?: string;
}

/**
 * Cria um ticket órfão (org_id NULL) a partir do formulário público
 * (não autenticado). `priority` é sempre fixada em "normal" — o formulário
 * público não expõe esse campo, então não faz sentido aceitá-lo do input.
 */
@Injectable()
export class CreatePublicTicketUseCase {
  constructor(
    @Inject(CAPTCHA_VERIFIER)
    private readonly captchaVerifier: ICaptchaVerifier,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_CATEGORY_REPOSITORY)
    private readonly ticketCategoryRepo: ITicketCategoryRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(data: CreatePublicTicketInput): Promise<TicketEntity> {
    const captchaOk = await this.captchaVerifier.verify(
      data.captchaToken,
      data.remoteIp,
    );
    if (!captchaOk) {
      throw new CaptchaVerificationFailedException();
    }

    // Mesma lógica de CreateTicketUseCase: a interface do repositório só
    // expõe `findById` (não há lookup por system_key) e `listEnabled()` já
    // filtra as categorias desabilitadas, então "não encontrada" e
    // "desabilitada" colapsam na mesma exceção.
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
      orgId: null,
      categoryId: category.id,
      createdBy: null,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      subject: data.subject,
      description: data.description,
      priority: "normal",
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
