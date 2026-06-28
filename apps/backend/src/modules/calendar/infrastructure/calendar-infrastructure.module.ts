import { Module } from "@nestjs/common";
import { CALENDAR_EVENT_REPOSITORY } from "../domain/calendar-event.repository.interface";
import { CALENDAR_CONNECTION_REPOSITORY } from "../domain/calendar-connection.repository.interface";
import { DrizzleCalendarEventRepository } from "./persistence/drizzle-calendar-event.repository";
import { DrizzleCalendarConnectionRepository } from "./persistence/drizzle-calendar-connection.repository";

@Module({
  providers: [
    {
      provide: CALENDAR_EVENT_REPOSITORY,
      useClass: DrizzleCalendarEventRepository,
    },
    {
      provide: CALENDAR_CONNECTION_REPOSITORY,
      useClass: DrizzleCalendarConnectionRepository,
    },
  ],
  exports: [CALENDAR_EVENT_REPOSITORY, CALENDAR_CONNECTION_REPOSITORY],
})
export class CalendarInfrastructureModule {}
