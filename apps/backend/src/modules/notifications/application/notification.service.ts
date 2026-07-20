import { Inject, Injectable, Logger } from "@nestjs/common";
import { MailService } from "../../mail/application/mail.service";
import {
  NotificationEntity,
  NotificationType,
} from "../domain/notification.entity";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../domain/notification.repository.interface";

export interface NotifyInput {
  userId: string;
  orgId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  email?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    private readonly mail: MailService,
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
        try {
          await this.mail.sendNotification({
            to: contact.email,
            title: input.title,
            body: input.body,
            actionUrl: input.actionUrl,
            actionLabel: input.actionLabel,
          });
        } catch (err) {
          this.logger.warn(
            `Falha ao enviar e-mail de notificação para ${contact.email}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }

    return notification;
  }
}
