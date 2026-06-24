import { Module } from "@nestjs/common";
import { CALENDAR_EVENT_REPOSITORY } from "../domain/calendar-event.repository.interface";
import { DrizzleCalendarEventRepository } from "./persistence/drizzle-calendar-event.repository";

@Module({
  providers: [
    {
      provide: CALENDAR_EVENT_REPOSITORY,
      useClass: DrizzleCalendarEventRepository,
    },
  ],
  exports: [CALENDAR_EVENT_REPOSITORY],
})
export class CalendarInfrastructureModule {}
