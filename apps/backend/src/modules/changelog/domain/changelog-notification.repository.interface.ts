export const CHANGELOG_NOTIFICATION_REPOSITORY = Symbol(
  "CHANGELOG_NOTIFICATION_REPOSITORY",
);

export interface IChangelogNotificationRepository {
  // Idempotente: ON CONFLICT (user_id, entry_id) DO NOTHING.
  recordSent(userId: string, entryId: string): Promise<void>;
  // `errorClass` é redigido pela implementação (redactDeliveryError) antes de
  // gravar — nunca persiste payload do provedor.
  recordFailed(
    userId: string,
    entryId: string,
    errorClass: string,
  ): Promise<void>;
}
