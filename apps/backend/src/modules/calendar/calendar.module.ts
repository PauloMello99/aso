import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ListCalendarEventsUseCase } from "./application/use-cases/list-calendar-events.use-case";
import { CreateCalendarEventUseCase } from "./application/use-cases/create-calendar-event.use-case";
import { UpdateCalendarEventUseCase } from "./application/use-cases/update-calendar-event.use-case";
import { DeleteCalendarEventUseCase } from "./application/use-cases/delete-calendar-event.use-case";
import { SendAgendaRemindersUseCase } from "./application/use-cases/send-agenda-reminders.use-case";
import { CalendarInfrastructureModule } from "./infrastructure/calendar-infrastructure.module";
import { CalendarController } from "./interface/calendar.controller";
import { CronController } from "./interface/cron.controller";

@Module({
  imports: [CalendarInfrastructureModule, AuthModule, NotificationsModule],
  controllers: [CalendarController, CronController],
  providers: [
    ListCalendarEventsUseCase,
    CreateCalendarEventUseCase,
    UpdateCalendarEventUseCase,
    DeleteCalendarEventUseCase,
    SendAgendaRemindersUseCase,
  ],
  exports: [CalendarInfrastructureModule],
})
export class CalendarModule {}
