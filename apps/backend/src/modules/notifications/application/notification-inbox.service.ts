import { Inject, Injectable } from "@nestjs/common";
import { NotificationEntity } from "../domain/notification.entity";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../domain/notification.repository.interface";

/** Operações da caixa de entrada do usuário atual (resolve auth_id → users.id). */
@Injectable()
export class NotificationInboxService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
  ) {}

  async list(
    authId: string,
    unreadOnly: boolean,
  ): Promise<{ items: NotificationEntity[]; unread: number }> {
    const userId = await this.repo.findUserIdByAuthId(authId);
    if (!userId) return { items: [], unread: 0 };
    const [items, unread] = await Promise.all([
      this.repo.findByUser(userId, { unreadOnly }),
      this.repo.countUnread(userId),
    ]);
    return { items, unread };
  }

  async markRead(authId: string, id: string): Promise<void> {
    const userId = await this.repo.findUserIdByAuthId(authId);
    if (userId) await this.repo.markRead(id, userId);
  }

  async markAllRead(authId: string): Promise<void> {
    const userId = await this.repo.findUserIdByAuthId(authId);
    if (userId) await this.repo.markAllRead(userId);
  }
}
