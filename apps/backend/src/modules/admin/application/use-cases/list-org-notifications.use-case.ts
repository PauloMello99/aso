import { Inject, Injectable } from "@nestjs/common";
import { ADMIN_REPOSITORY, IAdminRepository } from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from "../../../notifications/domain/notification.repository.interface";
import { NotificationEntity } from "../../../notifications/domain/notification.entity";

@Injectable()
export class ListOrgNotificationsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(orgId: string): Promise<NotificationEntity[]> {
    const org = await this.adminRepo.getOrgDetail(orgId);
    if (!org) throw new PlatformTargetNotFoundException(`org ${orgId}`);

    return this.notificationRepo.findByOrg(orgId);
  }
}
