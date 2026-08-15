import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import {
  isSlaBreached,
  isSlaNearBreach,
  TicketSlaAlertType,
} from "../../domain/ticket-sla";
import { SupportNotificationService } from "../support-notification.service";

export interface SweepTicketSlaResult {
  checked: number;
  breached: number;
  warned: number;
  errors: number;
}

/**
 * Job periódico (cron) que varre tickets com SLA vencido ou perto de vencer,
 * marca os campos de breach/warning correspondentes e dispara o alerta
 * interno (best-effort) apenas para os campos que passaram de null para
 * preenchido NESTE tick — a idempotência dos campos evita repetir o alerta
 * em ticks seguintes.
 */
@Injectable()
export class SweepTicketSlaUseCase {
  private readonly logger = new Logger(SweepTicketSlaUseCase.name);

  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(): Promise<SweepTicketSlaResult> {
    const now = new Date();
    const candidates = await this.ticketRepo.listSlaCandidates(now);

    let breached = 0;
    let warned = 0;
    let errors = 0;

    for (const ticket of candidates) {
      try {
        const outcome = await this.sweepOne(ticket, now);
        if (outcome === "breached") breached += 1;
        if (outcome === "warned") warned += 1;
      } catch (error) {
        errors += 1;
        this.logger.error(
          `Failed to sweep SLA for ticket ${ticket.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const result: SweepTicketSlaResult = {
      checked: candidates.length,
      breached,
      warned,
      errors,
    };
    this.logger.log(
      `SLA sweep complete: checked=${result.checked} breached=${result.breached} warned=${result.warned} errors=${result.errors}`,
    );
    return result;
  }

  private async sweepOne(
    ticket: TicketEntity,
    now: Date,
  ): Promise<"breached" | "warned" | "unchanged"> {
    let updated = ticket;
    const breachAlerts: TicketSlaAlertType[] = [];

    if (
      !updated.firstResponseAt &&
      !updated.slaFirstResponseBreachedAt &&
      isSlaBreached(now, updated.slaFirstResponseDueAt)
    ) {
      updated = updated.markSlaFirstResponseBreached(now);
      breachAlerts.push("first_response_breached");
    }

    if (
      !updated.resolvedAt &&
      !updated.closedAt &&
      !updated.slaResolutionBreachedAt &&
      isSlaBreached(now, updated.slaResolutionDueAt)
    ) {
      updated = updated.markSlaResolutionBreached(now);
      breachAlerts.push("resolution_breached");
    }

    if (breachAlerts.length > 0) {
      const persisted = await this.ticketRepo.updateAsAdmin(updated);
      for (const alertType of breachAlerts) {
        await this.notifications.notifySlaAlert(persisted, alertType);
      }
      return "breached";
    }

    const isFirstResponseNear =
      !updated.slaFirstResponseBreachedAt &&
      !updated.slaWarningNotifiedAt &&
      isSlaNearBreach(now, updated.slaFirstResponseDueAt, updated.createdAt);
    const isResolutionNear =
      !updated.slaResolutionBreachedAt &&
      !updated.slaWarningNotifiedAt &&
      isSlaNearBreach(now, updated.slaResolutionDueAt, updated.createdAt);

    if (isFirstResponseNear || isResolutionNear) {
      updated = updated.markSlaWarningNotified(now);
      const persisted = await this.ticketRepo.updateAsAdmin(updated);
      if (isFirstResponseNear) {
        await this.notifications.notifySlaAlert(
          persisted,
          "first_response_near",
        );
      }
      if (isResolutionNear) {
        await this.notifications.notifySlaAlert(persisted, "resolution_near");
      }
      return "warned";
    }

    return "unchanged";
  }
}
