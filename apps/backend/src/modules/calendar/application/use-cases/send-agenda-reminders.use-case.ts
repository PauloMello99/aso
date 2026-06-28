import { Inject, Injectable, Logger } from "@nestjs/common";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../domain/calendar-event.repository.interface";
import { NotificationService } from "../../../notifications/application/notification.service";

const DEFAULT_WINDOW_HOURS = 24;

@Injectable()
export class SendAgendaRemindersUseCase {
  private readonly logger = new Logger(SendAgendaRemindersUseCase.name);

  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly repo: ICalendarEventRepository,
    private readonly notifications: NotificationService,
  ) {}

  /** Lembra agendamentos que começam nas próximas `windowHours`. Idempotente. */
  async execute(windowHours = DEFAULT_WINDOW_HOURS): Promise<{ sent: number }> {
    const now = new Date();
    const until = new Date(now.getTime() + windowHours * 3_600_000);
    const due = await this.repo.findDueReminders(now, until);

    for (const ev of due) {
      const when = format(ev.startsAt, "dd/MM 'às' HH:mm", { locale: ptBR });
      await this.notifications.notify({
        userId: ev.assignedTo,
        orgId: ev.orgId,
        type: "agenda_reminder",
        title: "Lembrete de agendamento",
        body: `"${ev.title}" começa em ${when}.`,
        data: { eventId: ev.id },
      });
      await this.repo.markReminderSent(ev.id);
    }

    this.logger.log(`Agenda reminders enviados: ${due.length}`);
    return { sent: due.length };
  }
}
