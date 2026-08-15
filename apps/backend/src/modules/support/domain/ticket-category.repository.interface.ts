export const TICKET_CATEGORY_REPOSITORY = Symbol("TICKET_CATEGORY_REPOSITORY");

export interface TicketCategory {
  id: string;
  systemKey: string;
  label: string;
  slaFirstResponseMinutes: number;
  slaResolutionMinutes: number;
  enabled: boolean;
  createdAt: Date;
}

export interface ITicketCategoryRepository {
  /** Tabela global de leitura livre, via DRIZZLE. */
  listEnabled(): Promise<TicketCategory[]>;
  findById(id: string): Promise<TicketCategory | null>;
}
