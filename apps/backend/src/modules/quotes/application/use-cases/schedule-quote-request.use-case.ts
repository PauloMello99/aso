import { Inject, Injectable } from "@nestjs/common";
import { isActingAsSuperAdmin } from "../../../../common/request-context/acting-context";
import { AuditService } from "../../../audit/audit.service";
import { CreateCalendarEventUseCase } from "../../../calendar/application/use-cases/create-calendar-event.use-case";
import {
  CALENDAR_EVENT_REPOSITORY,
  ICalendarEventRepository,
} from "../../../calendar/domain/calendar-event.repository.interface";
import { hasModuleAccess } from "../../../organizations/domain/member-permissions";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IQuoteRequestRepository,
  QUOTE_REQUEST_REPOSITORY,
} from "../../domain/quote-request.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import { QuoteScheduleForbiddenException } from "../../domain/exceptions/quote-schedule-forbidden.exception";
import {
  buildQuoteEventTitle,
  toUsableCustomerEmail,
} from "../../domain/quote-schedule";
import { QuoteRequestCloser } from "../quote-request-closer";
import { resolveViewer } from "./resolve-viewer-scope";

export interface ScheduleQuoteRequestInput {
  orgId: string;
  authId: string;
  id: string;
  startsAt: Date;
  durationMinutes: number;
}

export interface ScheduleQuoteRequestOutput {
  eventId: string;
  startsAt: string;
  endsAt: string;
  alreadyScheduled: boolean;
}

// "Agendou": cria o evento pela sessao (mesma transacao do request) e agenda o
// encerramento para DEPOIS do COMMIT. O encerramento exige o evento commitado.
@Injectable()
export class ScheduleQuoteRequestUseCase {
  constructor(
    @Inject(QUOTE_REQUEST_REPOSITORY)
    private readonly requests: IQuoteRequestRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: IMemberRepository,
    private readonly createEvent: CreateCalendarEventUseCase,
    @Inject(CALENDAR_EVENT_REPOSITORY)
    private readonly calendarRepo: ICalendarEventRepository,
    private readonly closer: QuoteRequestCloser,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: ScheduleQuoteRequestInput,
  ): Promise<ScheduleQuoteRequestOutput> {
    const { member, scope } = await resolveViewer(
      this.members,
      input.orgId,
      input.authId,
    );
    // @RequireModule de metodo substituiria o 'quotes' da classe: checa aqui.
    if (!hasModuleAccess(member.role, member.permissions ?? [], "schedule")) {
      throw new QuoteScheduleForbiddenException();
    }

    const detail = await this.requests.findDetailForViewer(
      input.orgId,
      scope,
      input.id,
    );
    if (!detail) throw new QuoteRequestNotFoundException();

    const endsAt = new Date(
      input.startsAt.getTime() + input.durationMinutes * 60_000,
    );

    // Retry apos falha do hook: o evento ja existe; so refaz o encerramento
    // (sem hasOverlap e ignorando os horarios novos).
    const existing = await this.calendarRepo.findBySourceQuoteRequest(
      input.orgId,
      input.id,
    );
    let event: { id: string; startsAt: Date; endsAt: Date };
    const alreadyScheduled = existing !== null;
    if (existing) {
      if (existing.assignedTo !== detail.targetUserId) {
        throw new QuoteScheduleForbiddenException();
      }
      event = existing;
    } else {
      const created = await this.createEvent.execute({
        orgId: input.orgId,
        authId: input.authId,
        assignedTo: detail.targetUserId,
        type: "appointment",
        title: buildQuoteEventTitle(detail.requesterName),
        description: null,
        customerEmail: toUsableCustomerEmail(detail.requesterEmail),
        startsAt: input.startsAt,
        endsAt,
        allDay: false,
        visibility: "private",
        sourceQuoteRequestId: input.id,
      });
      // Lancar aqui faz rollback do evento (a transacao do request aborta).
      if (created.assignedTo !== detail.targetUserId) {
        throw new QuoteScheduleForbiddenException();
      }
      event = created;
    }

    // Captura sincrona: o hook roda depois do COMMIT, fora do contexto do request.
    const viaSuperAdmin = isActingAsSuperAdmin();
    const eventId = event.id;
    const imageCount = detail.images.length;
    this.closer.closeAfterCommit(
      {
        orgId: input.orgId,
        id: input.id,
        targetUserId: detail.targetUserId,
        outcome: "scheduled",
        now: new Date(),
        requiredEventId: eventId,
      },
      () =>
        this.audit.log({
          actorId: member.userId,
          orgId: input.orgId,
          action: "quote_request_closed",
          entityType: "quote_request",
          entityId: input.id,
          metadata: {
            outcome: "scheduled",
            imageCount,
            contactRetained: false,
            eventId,
          },
          actingAsSuperAdmin: viaSuperAdmin,
        }),
    );

    return {
      eventId,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      alreadyScheduled,
    };
  }
}
