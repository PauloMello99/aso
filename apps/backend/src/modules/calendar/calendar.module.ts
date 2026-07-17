import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ListCalendarEventsUseCase } from "./application/use-cases/list-calendar-events.use-case";
import { CreateCalendarEventUseCase } from "./application/use-cases/create-calendar-event.use-case";
import { UpdateCalendarEventUseCase } from "./application/use-cases/update-calendar-event.use-case";
import { DeleteCalendarEventUseCase } from "./application/use-cases/delete-calendar-event.use-case";
import { SendAgendaRemindersUseCase } from "./application/use-cases/send-agenda-reminders.use-case";
import { GetCalendarConnectionUseCase } from "./application/use-cases/get-calendar-connection.use-case";
import { DisconnectCalendarUseCase } from "./application/use-cases/disconnect-calendar.use-case";
import { SetEventRsvpUseCase } from "./application/use-cases/set-event-rsvp.use-case";
import { ListEventAttendeesUseCase } from "./application/use-cases/list-event-attendees.use-case";
import { CalendarInfrastructureModule } from "./infrastructure/calendar-infrastructure.module";
import { CalendarController } from "./interface/calendar.controller";
import { CalendarConnectionController } from "./interface/calendar-connection.controller";

@Module({
  imports: [CalendarInfrastructureModule, AuthModule, NotificationsModule],
  controllers: [CalendarController, CalendarConnectionController],
  providers: [
    ListCalendarEventsUseCase,
    CreateCalendarEventUseCase,
    UpdateCalendarEventUseCase,
    DeleteCalendarEventUseCase,
    SendAgendaRemindersUseCase,
    GetCalendarConnectionUseCase,
    DisconnectCalendarUseCase,
    SetEventRsvpUseCase,
    ListEventAttendeesUseCase,
  ],
  exports: [CalendarInfrastructureModule, SendAgendaRemindersUseCase],
})
export class CalendarModule {}
