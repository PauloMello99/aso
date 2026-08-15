import { TicketEntity } from "./ticket.entity";
import { TransactionContext } from "./ports/transaction-runner.port";

export const TICKET_REPOSITORY = Symbol("TICKET_REPOSITORY");

export interface ListTicketsByOrgFilters {
  status?: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface ListTicketsForAdminQueueFilters {
  status?: string;
  categoryId?: string;
  orgId?: string;
  /** Quando true, restringe a tickets órfãos (org_id NULL) — FC-3. */
  orphanOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface TicketOrgSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ITicketRepository {
  /**
   * Cria o ticket via DRIZZLE_ADMIN (org_id explícito, portal). `tx`
   * opcional: quando presente (ex.: `HandleInboundEmailUseCase`), roda na
   * mesma transação do caller em vez de abrir conexão própria.
   */
  createAsAdmin(
    ticket: TicketEntity,
    tx?: TransactionContext,
  ): Promise<TicketEntity>;
  /** Leitura escopada por org via DRIZZLE (RLS). */
  findByIdInOrg(id: string, orgId: string): Promise<TicketEntity | null>;
  /**
   * Leitura cross-org (fila admin, orgId não conhecido a priori) via
   * DRIZZLE_ADMIN. `tx` opcional (ver `createAsAdmin`).
   */
  findByIdAsAdmin(
    id: string,
    tx?: TransactionContext,
  ): Promise<TicketEntity | null>;
  /** Listagem escopada por org via DRIZZLE (RLS). */
  listByOrg(
    orgId: string,
    filters: ListTicketsByOrgFilters,
  ): Promise<{ items: TicketEntity[]; total: number }>;
  /**
   * Atualiza o ticket via DRIZZLE_ADMIN (reopen do portal, mudanças de
   * status da fila admin). `tx` opcional (ver `createAsAdmin`).
   */
  updateAsAdmin(
    ticket: TicketEntity,
    tx?: TransactionContext,
  ): Promise<TicketEntity>;
  /** Tickets elegíveis a checagem de SLA (cron), via DRIZZLE_ADMIN. */
  listSlaCandidates(now: Date): Promise<TicketEntity[]>;
  /** Fila admin (todas as orgs), via DRIZZLE_ADMIN. */
  listAllForAdminQueue(
    filters: ListTicketsForAdminQueueFilters,
  ): Promise<{ items: TicketEntity[]; total: number }>;
  /**
   * Nome/slug da org do ticket (cross-org, via DRIZZLE_ADMIN). Usado pelas
   * notificações de e-mail para montar o link do portal e identificar a org
   * nos alertas internos de SLA — mora aqui (e não em `organizations`) para
   * não criar dependência de módulo nova, seguindo o precedente de
   * `INotificationRepository.findUserContact`.
   */
  findOrgById(orgId: string): Promise<TicketOrgSummary | null>;
  /**
   * Vincula um ticket órfão (org_id NULL, criado via canal público/e-mail
   * inbound) a uma organização. Propaga `org_id` para o ticket e para todos
   * os seus `ticket_responses`/`ticket_attachments` filhos na MESMA
   * transação — é o único UPDATE permitido sobre linhas append-only do
   * módulo: repara metadado denormalizado de tenancy, não altera conteúdo
   * já registrado. A implementação (FC-15), após o update, faz um assert
   * de que não sobrou nenhum filho (response/attachment) com `org_id` NULL
   * para esse `ticketId` — caso reste, é bug de propagação e a transação é
   * abortada. Se 0 linhas forem afetadas no UPDATE do ticket (guarda
   * `AND org_id IS NULL`), lança `TicketAlreadyLinkedException` — segunda
   * camada de proteção contra corrida, além da checagem otimista feita
   * pelo use-case chamador.
   */
  linkToOrganization(ticketId: string, orgId: string): Promise<TicketEntity>;
}
