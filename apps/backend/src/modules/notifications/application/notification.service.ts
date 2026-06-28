import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationEntity,
  NotificationType,
} from "../domain/notification.entity";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../domain/notification.repository.interface";
import {
  EMAIL_SENDER,
  IEmailSender,
} from "../domain/ports/email-sender.port";

export interface NotifyInput {
  userId: string;
  orgId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  /** false desliga o canal de e-mail para esta notificação (default: tenta enviar). */
  email?: boolean;
}

/**
 * Núcleo reutilizável de notificações. Cria a notificação in-app e, opcionalmente,
 * dispara o canal de e-mail (best-effort — falha de e-mail nunca quebra o fluxo).
 * Outros módulos injetam este serviço para notificar usuários.
 */
@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    @Inject(EMAIL_SENDER)
    private readonly email: IEmailSender,
  ) {}

  async notify(input: NotifyInput): Promise<NotificationEntity> {
    const notification = await this.repo.create({
      userId: input.userId,
      orgId: input.orgId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    });

    if (input.email !== false) {
      const contact = await this.repo.findUserContact(input.userId);
      if (contact?.email) {
        const html = `<p>${escapeHtml(input.title)}</p>${
          input.body ? `<p>${escapeHtml(input.body)}</p>` : ""
        }`;
        // best-effort; o sender nunca lança
        await this.email.send({
          to: contact.email,
          subject: input.title,
          html,
        });
      }
    }

    return notification;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
