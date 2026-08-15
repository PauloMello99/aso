import { TransactionContext } from "./ports/transaction-runner.port";

export const TICKET_ATTACHMENT_REPOSITORY = Symbol(
  "TICKET_ATTACHMENT_REPOSITORY",
);

export interface TicketAttachmentRecord {
  id: string;
  ticketId: string;
  responseId: string | null;
  orgId: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface CreateTicketAttachmentData {
  ticketId: string;
  responseId: string | null;
  orgId: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
}

export interface ITicketAttachmentRepository {
  /**
   * Cria o registro via DRIZZLE_ADMIN (portal). O RLS de INSERT da tabela
   * exige que `storage_path` comece com `${org_id}/`, prefixo que o
   * use-case já controla ao montar o path — mesma lógica de writes
   * privilegiados dos demais repositórios do módulo.
   */
  createAsAdmin(
    data: CreateTicketAttachmentData,
    tx?: TransactionContext,
  ): Promise<TicketAttachmentRecord>;
  /** Lista os anexos de um ticket escopados por org via DRIZZLE (RLS). */
  listByTicketInOrg(
    ticketId: string,
    orgId: string,
  ): Promise<TicketAttachmentRecord[]>;
  /**
   * Lista os anexos de um ticket cross-org (fila admin) via DRIZZLE_ADMIN —
   * o ticketId já escopa a consulta, orgId não é conhecido a priori nesse
   * fluxo.
   */
  listByTicketAsAdmin(ticketId: string): Promise<TicketAttachmentRecord[]>;
  /** Busca um anexo por id escopado por org via DRIZZLE (RLS). */
  findByIdInOrg(
    id: string,
    orgId: string,
  ): Promise<TicketAttachmentRecord | null>;
  /**
   * Busca um anexo por id cross-org via DRIZZLE_ADMIN — usado pela fila
   * admin, que precisa gerar signed URL de anexo de ticket órfão (sem
   * `orgId` disponível para escopar a leitura).
   */
  findByIdAsAdmin(id: string): Promise<TicketAttachmentRecord | null>;
}
