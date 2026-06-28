import type { CalendarProvider } from "../../domain/calendar-connection.repository.interface";

export const EXTERNAL_CALENDAR_PROVIDER = Symbol("EXTERNAL_CALENDAR_PROVIDER");

/** Evento normalizado vindo de um calendário externo. */
export interface ExternalCalendarEvent {
  externalId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
}

/**
 * Porta (seam) do provedor de calendário externo — BL-1.
 *
 * Documenta o contrato que uma implementação real (Google/Outlook/Apple)
 * preencherá quando a integração OAuth/sync viva for priorizada. **Não há
 * implementação concreta registrada nesta fase** (a integração está atrás da
 * flag `EXTERNAL_CALENDARS_ENABLED`, desligada por padrão). O objetivo é fixar
 * o ponto de extensão para que ligar o OAuth depois seja um drop-in.
 */
export interface IExternalCalendarProvider {
  readonly provider: CalendarProvider;
  /** URL de autorização OAuth para a org iniciar a conexão. */
  getAuthorizationUrl(orgId: string, redirectUri: string): string;
  /** Troca o código OAuth pela conta vinculada (e persiste credenciais). */
  exchangeCode(orgId: string, code: string): Promise<{ accountEmail: string }>;
  /** Lê eventos do intervalo no calendário externo. */
  listEvents(
    orgId: string,
    from: Date,
    to: Date,
  ): Promise<ExternalCalendarEvent[]>;
  /** Revoga/limpa as credenciais da org no provedor. */
  disconnect(orgId: string): Promise<void>;
}
