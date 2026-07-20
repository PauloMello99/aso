export const CALENDAR_CONNECTION_REPOSITORY = Symbol(
  "CALENDAR_CONNECTION_REPOSITORY",
);

export type CalendarProvider = "google" | "outlook" | "apple";

export interface CalendarConnectionData {
  id: string;
  orgId: string;
  provider: CalendarProvider;
  externalAccountEmail: string | null;
  connectedBy: string | null;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICalendarConnectionRepository {
  findByOrg(orgId: string): Promise<CalendarConnectionData | null>;
  deleteByOrg(orgId: string): Promise<boolean>;
}
