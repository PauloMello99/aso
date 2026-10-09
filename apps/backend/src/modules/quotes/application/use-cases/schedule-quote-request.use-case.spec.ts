import { ScheduleQuoteRequestUseCase } from "./schedule-quote-request.use-case";
import type { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import type { ICalendarEventRepository } from "../../../calendar/domain/calendar-event.repository.interface";
import type { CreateCalendarEventUseCase } from "../../../calendar/application/use-cases/create-calendar-event.use-case";
import type { AuditService } from "../../../audit/audit.service";
import type { QuoteRequestCloser } from "../quote-request-closer";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import { QuoteScheduleForbiddenException } from "../../domain/exceptions/quote-schedule-forbidden.exception";
import { EventOverlapException } from "../../../calendar/domain/exceptions/event-overlap.exception";
import { isActingAsSuperAdmin } from "../../../../common/request-context/acting-context";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

jest.mock("../../../../common/request-context/acting-context", () => ({
  isActingAsSuperAdmin: jest.fn(),
}));

const isActingAsSuperAdminMock = isActingAsSuperAdmin as jest.MockedFunction<
  typeof isActingAsSuperAdmin
>;

beforeEach(() => {
  isActingAsSuperAdminMock.mockReset();
  isActingAsSuperAdminMock.mockReturnValue(false);
});

const STARTS_AT =new Date("2099-10-20T17:00:00.000Z");

function buildFakeDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    targetUserId: "user-2",
    targetDisplayName: "Maria",
    requesterName: "  Joao Silva ",
    requesterPhone: "+5511999998888",
    requesterEmail: "Joao@Example.com",
    idea: "Um leao no braco",
    status: "new",
    viewedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-31T00:00:00Z"),
    contactRetentionConsentAcceptedAt: null,
    images: [{ id: "i-1" }, { id: "i-2" }],
    ...overrides,
  };
}

function buildFakeCreatedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-1",
    assignedTo: "user-2",
    startsAt: STARTS_AT,
    endsAt: new Date(STARTS_AT.getTime() + 60 * 60_000),
    ...overrides,
  };
}

function build(
  options: {
    detail?: unknown;
    member?: Record<string, unknown>;
    existing?: unknown;
    created?: unknown;
  } = {},
) {
  const requests = {
    findDetailForViewer: jest
      .fn()
      .mockResolvedValue("detail" in options ? options.detail : buildFakeDetail()),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
  const members = {
    findByAuthId: jest.fn().mockResolvedValue(
      options.member ?? {
        role: "owner",
        userId: "user-1",
        enabled: true,
        permissions: [],
      },
    ),
  } as unknown as jest.Mocked<IMemberRepository>;
  const calendarRepo = {
    findBySourceQuoteRequest: jest.fn().mockResolvedValue(options.existing ?? null),
  } as unknown as jest.Mocked<ICalendarEventRepository>;
  const createEvent = {
    execute: jest.fn().mockResolvedValue(options.created ?? buildFakeCreatedEvent()),
  } as unknown as jest.Mocked<CreateCalendarEventUseCase>;
  const closer = {
    closeAfterCommit: jest.fn(),
  } as unknown as jest.Mocked<QuoteRequestCloser>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  return {
    requests,
    calendarRepo,
    createEvent,
    closer,
    audit,
    useCase: new ScheduleQuoteRequestUseCase(
      requests,
      members,
      createEvent,
      calendarRepo,
      closer,
      audit,
    ),
  };
}

const INPUT = {
  orgId: "org-1",
  authId: "auth-1",
  id: "r-1",
  startsAt: STARTS_AT,
  durationMinutes: 60,
};

describe("ScheduleQuoteRequestUseCase", () => {
  it("funcionario sem modulo 'schedule' => 403 e nada e criado", async () => {
    const { useCase, createEvent, closer } = build({
      member: { role: "employee", userId: "user-2", enabled: true, permissions: ["quotes"] },
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      QuoteScheduleForbiddenException,
    );
    expect(createEvent.execute).not.toHaveBeenCalled();
    expect(closer.closeAfterCommit).not.toHaveBeenCalled();
  });

  it("pedido fora do escopo (funcionario, pedido alheio) => 404 e nada criado", async () => {
    const { useCase, createEvent, closer } = build({
      detail: null,
      member: { role: "employee", userId: "user-9", enabled: true, permissions: ["schedule"] },
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      QuoteRequestNotFoundException,
    );
    expect(createEvent.execute).not.toHaveBeenCalled();
    expect(closer.closeAfterCommit).not.toHaveBeenCalled();
  });

  it("owner agenda para o targetUserId do detalhe; endsAt = startsAt + duracao", async () => {
    const { useCase, createEvent } = build();

    const output = await useCase.execute({ ...INPUT, durationMinutes: 90 });

    const call = createEvent.execute.mock.calls[0]?.[0];
    expect(call?.assignedTo).toBe("user-2");
    expect(call?.authId).toBe("auth-1");
    expect(call?.startsAt).toEqual(STARTS_AT);
    expect(call?.endsAt).toEqual(new Date(STARTS_AT.getTime() + 90 * 60_000));
    expect(call?.sourceQuoteRequestId).toBe("r-1");
    expect(output.alreadyScheduled).toBe(false);
    expect(output.eventId).toBe("ev-1");
  });

  it("conteudo minimo do evento: titulo, e-mail normalizado, sem telefone nem ideia", async () => {
    const { useCase, createEvent } = build();

    await useCase.execute(INPUT);

    const call = createEvent.execute.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      type: "appointment",
      title: "Orçamento: Joao Silva",
      description: null,
      customerEmail: "joao@example.com",
      allDay: false,
      visibility: "private",
    });
    const serialized = JSON.stringify(call);
    expect(serialized).not.toContain("5511999998888");
    expect(serialized).not.toContain("leao");
  });

  it("e-mail inutilizavel => customerEmail null e sem erro", async () => {
    const { useCase, createEvent } = build({
      detail: buildFakeDetail({ requesterEmail: "nao-e-email" }),
    });

    await useCase.execute(INPUT);

    expect(createEvent.execute.mock.calls[0]?.[0].customerEmail).toBeNull();
  });

  it("conflito de agenda propaga e o encerramento NAO e agendado (pedido intacto)", async () => {
    const { useCase, createEvent, closer } = build();
    createEvent.execute.mockRejectedValue(new EventOverlapException());

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(EventOverlapException);
    expect(closer.closeAfterCommit).not.toHaveBeenCalled();
  });

  it("evento existente (retry): nao cria, usa o id existente e responde alreadyScheduled", async () => {
    const existing = buildFakeCreatedEvent({ id: "ev-old" });
    const { useCase, createEvent, closer } = build({ existing });

    const output = await useCase.execute(INPUT);

    expect(createEvent.execute).not.toHaveBeenCalled();
    expect(output.alreadyScheduled).toBe(true);
    expect(output.eventId).toBe("ev-old");
    expect(closer.closeAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({ requiredEventId: "ev-old", outcome: "scheduled" }),
      expect.any(Function),
    );
  });

  it("evento existente de outro assignee => 403 e o encerramento nao e agendado", async () => {
    const { useCase, createEvent, closer } = build({
      existing: buildFakeCreatedEvent({ id: "ev-old", assignedTo: "user-outro" }),
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      QuoteScheduleForbiddenException,
    );
    expect(createEvent.execute).not.toHaveBeenCalled();
    expect(closer.closeAfterCommit).not.toHaveBeenCalled();
  });

  it("isActingAsSuperAdmin e capturado de forma sincrona (true no execute, false no onClosed)", async () => {
    const { useCase, closer, audit } = build();
    isActingAsSuperAdminMock.mockReturnValue(true);

    await useCase.execute(INPUT);
    isActingAsSuperAdminMock.mockReturnValue(false);

    const onClosed = closer.closeAfterCommit.mock.calls[0]?.[1];
    await onClosed?.({ contactRetained: false, purged: true });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ actingAsSuperAdmin: true }),
    );
  });

  it("drift de assignee => 403 e o encerramento nao e agendado", async () => {
    const { useCase, closer } = build({
      created: buildFakeCreatedEvent({ assignedTo: "user-outro" }),
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      QuoteScheduleForbiddenException,
    );
    expect(closer.closeAfterCommit).not.toHaveBeenCalled();
  });

  it("cria o evento ANTES de agendar o encerramento pos-commit, com prova do evento", async () => {
    const { useCase, createEvent, closer } = build();

    await useCase.execute(INPUT);

    expect(createEvent.execute.mock.invocationCallOrder[0]).toBeLessThan(
      closer.closeAfterCommit.mock.invocationCallOrder[0] ?? 0,
    );
    expect(closer.closeAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        id: "r-1",
        targetUserId: "user-2",
        outcome: "scheduled",
        requiredEventId: "ev-1",
      }),
      expect.any(Function),
    );
  });

  it("audit so dentro do onClosed, com metadata sem PII", async () => {
    const { useCase, closer, audit } = build();

    await useCase.execute(INPUT);
    expect(audit.log).not.toHaveBeenCalled();

    const onClosed = closer.closeAfterCommit.mock.calls[0]?.[1];
    await onClosed?.({ contactRetained: false, purged: true });

    expect(audit.log).toHaveBeenCalledTimes(1);
    const entry = audit.log.mock.calls[0]?.[0];
    expect(entry).toMatchObject({
      actorId: "user-1",
      orgId: "org-1",
      action: "quote_request_closed",
      entityType: "quote_request",
      entityId: "r-1",
      metadata: {
        outcome: "scheduled",
        imageCount: 2,
        contactRetained: false,
        eventId: "ev-1",
      },
    });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("Joao");
    expect(serialized).not.toContain("joao@example.com");
  });
});
