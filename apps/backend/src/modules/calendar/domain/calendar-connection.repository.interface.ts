export const CALENDAR_CONNECTION_REPOSITORY = Symbol(
  "CALENDAR_CONNECTION_REPOSITORY",
);

export type CalendarProvider = "google" | "outlook" | "apple";

/** Estado da conexão de calendário externo de uma org (BL-1). */
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
  /** Remove a conexão da org. Retorna true se havia uma. */
  deleteByOrg(orgId: string): Promise<boolean>;
}
