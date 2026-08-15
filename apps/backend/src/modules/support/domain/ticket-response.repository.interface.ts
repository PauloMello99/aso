import { TicketResponseEntity } from "./ticket-response.entity";
import { TransactionContext } from "./ports/transaction-runner.port";

export const TICKET_RESPONSE_REPOSITORY = Symbol("TICKET_RESPONSE_REPOSITORY");

export interface ITicketResponseRepository {
  /**
   * Cria a resposta via DRIZZLE_ADMIN (org_id explícito, portal). `tx`
   * opcional: quando presente (ex.: `HandleInboundEmailUseCase`), roda na
   * mesma transação do caller em vez de abrir conexão própria.
   */
  createAsAdmin(
    response: TicketResponseEntity,
    tx?: TransactionContext,
  ): Promise<TicketResponseEntity>;
  /** Lista as respostas de um ticket escopadas por org via DRIZZLE (RLS). */
  listByTicketInOrg(
    ticketId: string,
    orgId: string,
    includeInternal: boolean,
  ): Promise<TicketResponseEntity[]>;
  /**
   * Lista as respostas de um ticket cross-org (fila admin) via
   * DRIZZLE_ADMIN — o ticketId já escopa a consulta, orgId não é conhecido
   * a priori nesse fluxo.
   */
  listByTicketAsAdmin(
    ticketId: string,
    includeInternal: boolean,
  ): Promise<TicketResponseEntity[]>;
}
