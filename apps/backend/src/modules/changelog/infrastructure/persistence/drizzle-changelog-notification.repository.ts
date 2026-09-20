// Injeta DRIZZLE_ADMIN (não DRIZZLE) de propósito: este repositório serve o cron
// cross-org de anúncios de changelog, que roda sem contexto de request — sob
// ADR-0005 o pool DRIZZLE resolveria zero linhas SEM erro (bug silencioso).
// `changelog_notifications` não tem FK (log histórico; LGPD); a integridade do
// `user_id` é responsabilidade da query de alvo (drizzle-changelog-target.repository).
// A ESCRITA não tem policy de RLS — só DRIZZLE_ADMIN (bypassrls) grava.
import { Inject, Injectable } from "@nestjs/common";
import {
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { IChangelogNotificationRepository } from "../../domain/changelog-notification.repository.interface";
import { redactDeliveryError } from "../../domain/redact-delivery-error";

@Injectable()
export class DrizzleChangelogNotificationRepository
  implements IChangelogNotificationRepository
{
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async recordSent(userId: string, entryId: string): Promise<void> {
    // CHECK changelog_notifications_sent_at_check: 'sent' => sent_at NOT NULL e
    // error NULL.
    await this.db
      .insert(schema.changelogNotifications)
      .values({ userId, entryId, status: "sent", error: null, sentAt: new Date() })
      .onConflictDoNothing({
        target: [
          schema.changelogNotifications.userId,
          schema.changelogNotifications.entryId,
        ],
      });
  }

  async recordFailed(
    userId: string,
    entryId: string,
    errorClass: string,
  ): Promise<void> {
    // Redige SEMPRE (defesa em profundidade, mesmo que o caller já redija): o
    // provedor pode ecoar o e-mail e este log sobrevive ao usuário. CHECK:
    // 'failed' => sent_at NULL.
    await this.db
      .insert(schema.changelogNotifications)
      .values({
        userId,
        entryId,
        status: "failed",
        error: redactDeliveryError(errorClass),
        sentAt: null,
      })
      .onConflictDoNothing({
        target: [
          schema.changelogNotifications.userId,
          schema.changelogNotifications.entryId,
        ],
      });
  }
}
