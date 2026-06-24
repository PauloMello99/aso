import { Controller, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../../common/guards/cron-secret.guard";
import { SendStockCheckRemindersUseCase } from "../application/use-cases/send-stock-check-reminders.use-case";

// Job interno (Railway) com header x-cron-secret.
@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class StockCronController {
  constructor(
    private readonly sendStockCheckReminders: SendStockCheckRemindersUseCase,
  ) {}

  @Post("stock-check-reminders")
  async stockCheckReminders() {
    return this.sendStockCheckReminders.execute();
  }
}
