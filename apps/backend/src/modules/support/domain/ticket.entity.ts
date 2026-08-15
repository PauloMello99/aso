import { TicketInvalidException } from "./exceptions/ticket-invalid.exception";
import { TicketInvalidTransitionException } from "./exceptions/ticket-invalid-transition.exception";
import { TicketNotReopenableException } from "./exceptions/ticket-not-reopenable.exception";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

const SUBJECT_MIN_LENGTH = 5;
const SUBJECT_MAX_LENGTH = 200;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 5000;

export interface TicketEntityProps {
  id: string;
  orgId: string | null;
  categoryId: string;
  createdBy: string | null;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAgentId: string | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  slaFirstResponseDueAt: Date;
  slaResolutionDueAt: Date;
  slaFirstResponseBreachedAt: Date | null;
  slaResolutionBreachedAt: Date | null;
  slaWarningNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketData {
  id: string;
  orgId: string | null;
  categoryId: string;
  createdBy: string | null;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  slaFirstResponseDueAt: Date;
  slaResolutionDueAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Ordem linear de progressão "para frente" do ciclo de vida do ticket. */
const FORWARD_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["in_progress"],
  in_progress: ["waiting_customer", "resolved"],
  waiting_customer: ["in_progress", "resolved"],
  resolved: ["closed"],
  closed: [],
};

export class TicketEntity {
  readonly id: string;
  readonly orgId: string | null;
  readonly categoryId: string;
  readonly createdBy: string | null;
  readonly requesterName: string;
  readonly requesterEmail: string;
  readonly subject: string;
  readonly description: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly assignedAgentId: string | null;
  readonly firstResponseAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
  readonly reopenedAt: Date | null;
  readonly slaFirstResponseDueAt: Date;
  readonly slaResolutionDueAt: Date;
  readonly slaFirstResponseBreachedAt: Date | null;
  readonly slaResolutionBreachedAt: Date | null;
  readonly slaWarningNotifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TicketEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.categoryId = props.categoryId;
    this.createdBy = props.createdBy;
    this.requesterName = props.requesterName;
    this.requesterEmail = props.requesterEmail;
    this.subject = props.subject;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.assignedAgentId = props.assignedAgentId;
    this.firstResponseAt = props.firstResponseAt;
    this.resolvedAt = props.resolvedAt;
    this.closedAt = props.closedAt;
    this.reopenedAt = props.reopenedAt;
    this.slaFirstResponseDueAt = props.slaFirstResponseDueAt;
    this.slaResolutionDueAt = props.slaResolutionDueAt;
    this.slaFirstResponseBreachedAt = props.slaFirstResponseBreachedAt;
    this.slaResolutionBreachedAt = props.slaResolutionBreachedAt;
    this.slaWarningNotifiedAt = props.slaWarningNotifiedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Reconstrói a entidade a partir de um estado já persistido (mapper). */
  static fromProps(props: TicketEntityProps): TicketEntity {
    return new TicketEntity(props);
  }

  /**
   * Cria um novo ticket. Status inicial é sempre "open"; assignedAgentId e os
   * timestamps de ciclo de vida (first response, resolved, closed, reopened,
   * SLA breach/warning) são responsabilidade do backend e não podem ser
   * definidos na criação.
   */
  static create(data: CreateTicketData): TicketEntity {
    const subject = data.subject.trim();
    if (
      subject.length < SUBJECT_MIN_LENGTH ||
      subject.length > SUBJECT_MAX_LENGTH
    ) {
      throw new TicketInvalidException(
        `Ticket subject must be between ${SUBJECT_MIN_LENGTH} and ${SUBJECT_MAX_LENGTH} characters`,
      );
    }

    const description = data.description.trim();
    if (
      description.length < DESCRIPTION_MIN_LENGTH ||
      description.length > DESCRIPTION_MAX_LENGTH
    ) {
      throw new TicketInvalidException(
        `Ticket description must be between ${DESCRIPTION_MIN_LENGTH} and ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    }

    return new TicketEntity({
      id: data.id,
      orgId: data.orgId,
      categoryId: data.categoryId,
      createdBy: data.createdBy,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      subject,
      description,
      status: "open",
      priority: data.priority ?? "normal",
      assignedAgentId: null,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenedAt: null,
      slaFirstResponseDueAt: data.slaFirstResponseDueAt,
      slaResolutionDueAt: data.slaResolutionDueAt,
      slaFirstResponseBreachedAt: null,
      slaResolutionBreachedAt: null,
      slaWarningNotifiedAt: null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private assertTransition(to: TicketStatus): void {
    const allowed = FORWARD_TRANSITIONS[this.status];
    if (!allowed.includes(to)) {
      throw new TicketInvalidTransitionException(this.id, this.status, to);
    }
  }

  markInProgress(now: Date = new Date()): TicketEntity {
    this.assertTransition("in_progress");
    return new TicketEntity({
      ...this.toProps(),
      status: "in_progress",
      updatedAt: now,
    });
  }

  markWaitingCustomer(now: Date = new Date()): TicketEntity {
    this.assertTransition("waiting_customer");
    return new TicketEntity({
      ...this.toProps(),
      status: "waiting_customer",
      updatedAt: now,
    });
  }

  markResolved(now: Date = new Date()): TicketEntity {
    this.assertTransition("resolved");
    return new TicketEntity({
      ...this.toProps(),
      status: "resolved",
      resolvedAt: now,
      updatedAt: now,
    });
  }

  close(now: Date = new Date()): TicketEntity {
    this.assertTransition("closed");
    return new TicketEntity({
      ...this.toProps(),
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Atribui (ou reatribui) o agente responsável pelo ticket. Não altera o
   * status — a decisão de também transicionar para "in_progress" (caso o
   * ticket ainda esteja "open") é do use-case, que deve chamar
   * `markInProgress()` antes, se aplicável.
   */
  assignAgent(agentUserId: string, now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      assignedAgentId: agentUserId,
      updatedAt: now,
    });
  }

  /**
   * Marca o instante da primeira resposta de um agente (métrica de SLA).
   * Idempotência (não sobrescrever se já setado) é responsabilidade do
   * use-case chamador.
   */
  markFirstResponse(now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      firstResponseAt: now,
      updatedAt: now,
    });
  }

  /**
   * Marca o instante do breach do SLA de primeira resposta. Idempotência
   * (não sobrescrever se já setado) é responsabilidade do use-case chamador.
   */
  markSlaFirstResponseBreached(now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      slaFirstResponseBreachedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Marca o instante do breach do SLA de resolução. Idempotência (não
   * sobrescrever se já setado) é responsabilidade do use-case chamador.
   */
  markSlaResolutionBreached(now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      slaResolutionBreachedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Marca o instante em que o warning de "SLA perto de vencer" foi
   * disparado. Idempotência (não sobrescrever se já setado, disparar só uma
   * vez por ticket) é responsabilidade do use-case chamador.
   */
  markSlaWarningNotified(now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      slaWarningNotifiedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reabre um ticket resolvido ou fechado: status volta a "open",
   * reopenedAt = now, e resolvedAt/closedAt são zerados (um ticket "open"
   * com resolvedAt/closedAt preenchidos é um estado inconsistente — o cron
   * de SLA, por exemplo, exclui tickets com resolvedAt não nulo da varredura,
   * então mantê-los preenchidos faz o ticket reaberto nunca mais ser
   * verificado). NÃO recalcula sla_first_response_due_at (o prazo de
   * primeira resposta já foi cumprido ou não na primeira rodada e continua
   * congelado). O recálculo de sla_resolution_due_at é decisão do use-case,
   * via `resetResolutionSla`.
   */
  reopen(now: Date = new Date()): TicketEntity {
    if (this.status !== "resolved" && this.status !== "closed") {
      throw new TicketNotReopenableException(this.id, this.status);
    }
    return new TicketEntity({
      ...this.toProps(),
      status: "open",
      resolvedAt: null,
      closedAt: null,
      reopenedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Recalcula o prazo de SLA de resolução (uso típico: depois de `reopen()`,
   * quando o ticket volta a contar prazo). Zera também o breach e o warning
   * de resolução já disparados, já que passam a se referir ao prazo antigo.
   */
  resetResolutionSla(newDueAt: Date, now: Date = new Date()): TicketEntity {
    return new TicketEntity({
      ...this.toProps(),
      slaResolutionDueAt: newDueAt,
      slaResolutionBreachedAt: null,
      slaWarningNotifiedAt: null,
      updatedAt: now,
    });
  }

  private toProps(): TicketEntityProps {
    return {
      id: this.id,
      orgId: this.orgId,
      categoryId: this.categoryId,
      createdBy: this.createdBy,
      requesterName: this.requesterName,
      requesterEmail: this.requesterEmail,
      subject: this.subject,
      description: this.description,
      status: this.status,
      priority: this.priority,
      assignedAgentId: this.assignedAgentId,
      firstResponseAt: this.firstResponseAt,
      resolvedAt: this.resolvedAt,
      closedAt: this.closedAt,
      reopenedAt: this.reopenedAt,
      slaFirstResponseDueAt: this.slaFirstResponseDueAt,
      slaResolutionDueAt: this.slaResolutionDueAt,
      slaFirstResponseBreachedAt: this.slaFirstResponseBreachedAt,
      slaResolutionBreachedAt: this.slaResolutionBreachedAt,
      slaWarningNotifiedAt: this.slaWarningNotifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
