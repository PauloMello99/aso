import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AppointmentConfirmationDispatcher } from "./application/appointment-confirmation-dispatcher";
import { ListCalendarEventsUseCase } from "./application/use-cases/list-calendar-events.use-case";
import { CreateCalendarEventUseCase } from "./application/use-cases/create-calendar-event.use-case";
import { UpdateCalendarEventUseCase } from "./application/use-cases/update-calendar-event.use-case";
import { DeleteCalendarEventUseCase } from "./application/use-cases/delete-calendar-event.use-case";
import { SendAgendaRemindersUseCase } from "./application/use-cases/send-agenda-reminders.use-case";
import { SendCustomerConfirmationRemindersUseCase } from "./application/use-cases/send-customer-confirmation-reminders.use-case";
import { GetCalendarConnectionUseCase } from "./application/use-cases/get-calendar-connection.use-case";
import { DisconnectCalendarUseCase } from "./application/use-cases/disconnect-calendar.use-case";
import { SetEventRsvpUseCase } from "./application/use-cases/set-event-rsvp.use-case";
import { ListEventAttendeesUseCase } from "./application/use-cases/list-event-attendees.use-case";
import { GetAppointmentConfirmationByTokenUseCase } from "./application/use-cases/get-appointment-confirmation-by-token.use-case";
import { RespondAppointmentConfirmationUseCase } from "./application/use-cases/respond-appointment-confirmation.use-case";
import { CalendarInfrastructureModule } from "./infrastructure/calendar-infrastructure.module";
import { CalendarController } from "./interface/calendar.controller";
import { CalendarConnectionController } from "./interface/calendar-connection.controller";
import { PublicAppointmentConfirmationController } from "./interface/public-appointment-confirmation.controller";
import { AppointmentConfirmationFeatureFlagGuard } from "./interface/appointment-confirmation-feature-flag.guard";

@Module({
  imports: [
    CalendarInfrastructureModule,
    AuthModule,
    NotificationsModule,
    SubscriptionsModule,
    MailModule,
  ],
  controllers: [
    CalendarController,
    CalendarConnectionController,
    PublicAppointmentConfirmationController,
  ],
  providers: [
    AppointmentConfirmationDispatcher,
    AppointmentConfirmationFeatureFlagGuard,
    GetAppointmentConfirmationByTokenUseCase,
    RespondAppointmentConfirmationUseCase,
    ListCalendarEventsUseCase,
    CreateCalendarEventUseCase,
    UpdateCalendarEventUseCase,
    DeleteCalendarEventUseCase,
    SendAgendaRemindersUseCase,
    SendCustomerConfirmationRemindersUseCase,
    GetCalendarConnectionUseCase,
    DisconnectCalendarUseCase,
    SetEventRsvpUseCase,
    ListEventAttendeesUseCase,
  ],
  exports: [
    CalendarInfrastructureModule,
    SendAgendaRemindersUseCase,
    SendCustomerConfirmationRemindersUseCase,
  ],
})
export class CalendarModule {}
