export const STOCK_VERIFICATION_REPOSITORY = Symbol(
  "STOCK_VERIFICATION_REPOSITORY",
);

export interface VerificationItemInput {
  materialId: string;
  systemQuantity: string;
  physicalQuantity: string;
}

export interface VerificationSummary {
  id: string;
  performedBy: string | null;
  note: string | null;
  createdAt: Date;
  itemCount: number;
  discrepancyCount: number;
}

export interface OrgDueForCheck {
  orgId: string;
  intervalDays: number;
  lastCheckAt: Date | null;
}

export interface IStockVerificationRepository {
  getInterval(orgId: string): Promise<number | null>;
  setInterval(orgId: string, days: number | null): Promise<void>;
  lastVerificationAt(orgId: string): Promise<Date | null>;
  /** Cria o cabeçalho + itens; retorna o id. */
  create(data: {
    orgId: string;
    performedBy: string | null;
    note: string | null;
    items: VerificationItemInput[];
  }): Promise<string>;
  listByOrg(orgId: string): Promise<VerificationSummary[]>;
  /** Orgs com intervalo configurado cujo prazo desde a última verificação expirou. */
  findOrgsDue(): Promise<OrgDueForCheck[]>;
  /** userIds dos owners ativos de uma org (para notificar). */
  findOwnerUserIds(orgId: string): Promise<string[]>;
}
