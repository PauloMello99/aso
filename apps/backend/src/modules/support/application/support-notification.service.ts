import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../mail/application/mail.service";
import { TicketEntity, TicketStatus } from "../domain/ticket.entity";
import { TicketResponseEntity } from "../domain/ticket-response.entity";
import { TicketSlaAlertType } from "../domain/ticket-sla";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../domain/ticket.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";

const STATUS_LABELS_PT_BR: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

/**
 * Status para os quais vale notificar o requester por e-mail. "in_progress"
 * e "waiting_customer" são mudanças operacionais internas, sem valor claro
 * pro cliente; "resolved"/"closed" são os desfechos que ele precisa saber.
 */
const STATUS_CHANGE_NOTIFIABLE: ReadonlySet<TicketStatus> = new Set([
  "resolved",
  "closed",
]);

/**
 * Centraliza o disparo de e-mails do módulo de suporte (ADR-0012:
 * transacional, best-effort — falha de e-mail nunca derruba o fluxo que a
 * chamou). Todo método aqui captura sua própria exceção e só loga; o
 * caller (use-case) nunca precisa de try/catch.
 */
@Injectable()
export class SupportNotificationService {
  private readonly logger = new Logger(SupportNotificationService.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async notifyTicketCreated(ticket: TicketEntity): Promise<void> {
    try {
      const portalUrl = await this.buildPortalUrl(ticket.orgId);
      await this.mail.sendTicketCreated({
        to: ticket.requesterEmail,
        requesterName: ticket.requesterName,
        ticketSubject: ticket.subject,
        ticketId: ticket.id,
        portalUrl,
        replyTo: this.inboundReplyTo(ticket.id),
      });
    } catch (err) {
      this.logFailure("notifyTicketCreated", ticket.id, err);
    }
  }

  async notifyAgentResponseAdded(
    ticket: TicketEntity,
    response: TicketResponseEntity,
  ): Promise<void> {
    if (response.isInternalNote) return;
    try {
      const portalUrl = await this.buildPortalUrl(ticket.orgId);
      await this.mail.sendTicketResponseAdded({
        to: ticket.requesterEmail,
        requesterName: ticket.requesterName,
        ticketSubject: ticket.subject,
        responseBody: response.body,
        portalUrl: portalUrl ?? this.frontendUrl(),
        replyTo: this.inboundReplyTo(ticket.id),
      });
    } catch (err) {
      this.logFailure("notifyAgentResponseAdded", ticket.id, err);
    }
  }

  async notifyStatusChanged(
    ticket: TicketEntity,
    previousStatus: TicketStatus,
  ): Promise<void> {
    if (
      ticket.status === previousStatus ||
      !STATUS_CHANGE_NOTIFIABLE.has(ticket.status)
    ) {
      return;
    }
    try {
      const portalUrl = await this.buildPortalUrl(ticket.orgId);
      await this.mail.sendTicketStatusChanged({
        to: ticket.requesterEmail,
        requesterName: ticket.requesterName,
        ticketSubject: ticket.subject,
        newStatus: STATUS_LABELS_PT_BR[ticket.status],
        portalUrl,
        replyTo: this.inboundReplyTo(ticket.id),
      });
    } catch (err) {
      this.logFailure("notifyStatusChanged", ticket.id, err);
    }
  }

  /**
   * Reabertura sempre volta o status para "open" (ver TicketEntity.reopen),
   * que não está em STATUS_CHANGE_NOTIFIABLE — por isso usa um label
   * dedicado ("Reaberto") em vez do rótulo genérico de "open".
   */
  async notifyReopened(ticket: TicketEntity): Promise<void> {
    try {
      const portalUrl = await this.buildPortalUrl(ticket.orgId);
      await this.mail.sendTicketStatusChanged({
        to: ticket.requesterEmail,
        requesterName: ticket.requesterName,
        ticketSubject: ticket.subject,
        newStatus: "Reaberto",
        portalUrl,
        replyTo: this.inboundReplyTo(ticket.id),
      });
    } catch (err) {
      this.logFailure("notifyReopened", ticket.id, err);
    }
  }

  /**
   * Alerta interno (nunca vai pro cliente) para todos os usuários com
   * platform_role = 'super_admin'.
   */
  async notifySlaAlert(
    ticket: TicketEntity,
    alertType: TicketSlaAlertType,
  ): Promise<void> {
    try {
      const [org, admins] = await Promise.all([
        ticket.orgId ? this.ticketRepo.findOrgById(ticket.orgId) : null,
        this.userRepo.findPlatformAdminEmails(),
      ]);
      if (admins.length === 0) return;

      const queueUrl = `${this.frontendUrl()}/admin/support`;
      await Promise.all(
        admins.map((admin) =>
          this.mail.sendTicketSlaAlert({
            to: admin.email,
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
            orgName: org?.name ?? ticket.orgId ?? "Sem organização",
            alertType,
            queueUrl,
          }),
        ),
      );
    } catch (err) {
      this.logFailure("notifySlaAlert", ticket.id, err);
    }
  }

  /**
   * Ticket órfão (org_id NULL, ainda não vinculado a uma organização) não
   * tem portal — retorna undefined nesse caso, sem lançar.
   */
  private async buildPortalUrl(
    orgId: string | null,
  ): Promise<string | undefined> {
    if (!orgId) return undefined;
    const org = await this.ticketRepo.findOrgById(orgId);
    if (!org) return undefined;
    return `${this.frontendUrl()}/dashboard/org/${org.slug}/support`;
  }

  private frontendUrl(): string {
    return this.config.get<string>("FRONTEND_URL", "http://localhost:3000");
  }

  /**
   * Reply-To por plus-addressing pra threading e-mail-to-ticket. Domínio
   * configurado é o raiz (assessorink-so.com, decisão do usuário) — pode conflitar
   * com MX de e-mail corporativo já existente; validar com quem administra
   * o DNS antes do deploy. Se houver conflito, trocar SUPPORT_INBOUND_DOMAIN
   * pra um subdomínio dedicado é mudança de env, zero mudança de código.
   */
  private inboundReplyTo(ticketId: string): string | undefined {
    const domain = this.config.get<string>("SUPPORT_INBOUND_DOMAIN");
    if (!domain) return undefined;
    const localPart = this.config.get<string>(
      "SUPPORT_INBOUND_LOCAL_PART",
      "suporte",
    );
    return `${localPart}+${ticketId}@${domain}`;
  }

  private logFailure(method: string, ticketId: string, err: unknown): void {
    this.logger.warn(
      `Falha ao enviar notificação de suporte (${method}) para o ticket ${ticketId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
