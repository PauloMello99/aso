import { Inject, Injectable } from "@nestjs/common";
import { NotificationService } from "../../../notifications/application/notification.service";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
} from "../../domain/stock-verification.repository.interface";

@Injectable()
export class SendStockCheckRemindersUseCase {
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly repo: IStockVerificationRepository,
    private readonly notifications: NotificationService,
  ) {}

  async execute(): Promise<{ orgsNotified: number; notifications: number }> {
    const due = await this.repo.findOrgsDue();
    let count = 0;

    for (const org of due) {
      const owners = await this.repo.findOwnerUserIds(org.orgId);
      for (const userId of owners) {
        await this.notifications.notify({
          userId,
          orgId: org.orgId,
          type: "stock_check_reminder",
          title: "Hora de conferir o estoque",
          body: `Já se passaram ${org.intervalDays} dias desde a última conferência de estoque.`,
        });
        count++;
      }
    }

    return { orgsNotified: due.length, notifications: count };
  }
}
