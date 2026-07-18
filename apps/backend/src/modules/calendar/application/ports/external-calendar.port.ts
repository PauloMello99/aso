import type { CalendarProvider } from "../../domain/calendar-connection.repository.interface";

export const EXTERNAL_CALENDAR_PROVIDER = Symbol("EXTERNAL_CALENDAR_PROVIDER");

export interface ExternalCalendarEvent {
  externalId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
}

export interface IExternalCalendarProvider {
  readonly provider: CalendarProvider;
  getAuthorizationUrl(orgId: string, redirectUri: string): string;
  exchangeCode(orgId: string, code: string): Promise<{ accountEmail: string }>;
  listEvents(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ExternalCalendarEvent[]>;
  disconnect(orgId: string): Promise<void>;
}
