import { Controller, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../../common/guards/cron-secret.guard";
import { SendAgendaRemindersUseCase } from "../application/use-cases/send-agenda-reminders.use-case";

// Endpoints internos batidos por um job agendado (Railway) com header x-cron-secret.
@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class CronController {
  constructor(
    private readonly sendAgendaReminders: SendAgendaRemindersUseCase,
  ) {}

  @Post("agenda-reminders")
  async agendaReminders() {
    return this.sendAgendaReminders.execute();
  }
}
