import type { NotificationService } from "../../../notifications/application/notification.service";
import {
  CalendarEventEntity,
  type CalendarEventConfirmationData,
  type CreateCalendarEventData,
} from "../../domain/calendar-event.entity";
import type { ICalendarEventRepository } from "../../domain/calendar-event.repository.interface";
import type { AppointmentConfirmationDispatcher } from "../appointment-confirmation-dispatcher";
import {
  CreateCalendarEventUseCase,
  type CreateCalendarEventInput,
} from "./create-calendar-event.use-case";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

// Bem no futuro: o ciclo só começa com startsAt > now.
const FUTURE_STARTS_AT = new Date("2099-10-20T17:00:00.000Z");
const FUTURE_ENDS_AT = new Date("2099-10-20T19:00:00.000Z");

const CONFIRMATION: CalendarEventConfirmationData = {
  status: "pending",
  tokenHash: "hash-1",
  requestedAt: new Date("2026-10-08T12:00:00.000Z"),
  sentAt: null,
  respondedAt: null,
  customerReminderSentAt: null,
};

function buildFakeEvent(data: CreateCalendarEventData): CalendarEventEntity {
  return CalendarEventEntity.create({
    id: "ev-1",
    orgId: data.orgId,
    assignedTo: data.assignedTo,
    customerId: data.customerId ?? null,
    createdBy: data.createdBy ?? null,
    type: data.type,
    status: "scheduled",
    title: data.title,
    description: data.description ?? null,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    allDay: data.allDay ?? false,
    visibility: data.visibility ?? "private",
    customerEmail: data.customerEmail ?? null,
    confirmationStatus: data.confirmation?.status ?? null,
    confirmationRequestedAt: data.confirmation?.requestedAt ?? null,
    confirmationSentAt: null,
    confirmationRespondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildFakeInput(
  overrides: Partial<CreateCalendarEventInput> = {},
): CreateCalendarEventInput {
  return {
    orgId: "org-1",
    authId: "auth-1",
    type: "appointment",
    title: "Tattoo",
    customerEmail: "  Ana@Example.com ",
    startsAt: FUTURE_STARTS_AT,
    endsAt: FUTURE_ENDS_AT,
    ...overrides,
  };
}

function buildRepo(): jest.Mocked<ICalendarEventRepository> {
  return {
    getMembership: jest
      .fn()
      .mockResolvedValue({ userId: "user-1", role: "owner", name: "Helena" }),
    isOrgMember: jest.fn().mockResolvedValue(true),
    hasOverlap: jest.fn().mockResolvedValue(false),
    create: jest.fn((data: CreateCalendarEventData) =>
      Promise.resolve(buildFakeEvent(data)),
    ),
    findOrgOwners: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<ICalendarEventRepository>;
}

function buildDispatcher(
  enabled: boolean,
): jest.Mocked<AppointmentConfirmationDispatcher> {
  return {
    isEnabled: jest.fn().mockReturnValue(enabled),
    buildCycle: jest
      .fn()
      .mockReturnValue({ token: "tok-1", confirmation: CONFIRMATION }),
    scheduleConfirmation: jest.fn(),
  } as unknown as jest.Mocked<AppointmentConfirmationDispatcher>;
}

function build(enabled = true) {
  const repo = buildRepo();
  const dispatcher = buildDispatcher(enabled);
  const notifications = {
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationService>;
  const useCase = new CreateCalendarEventUseCase(repo, notifications, dispatcher);
  return { useCase, repo, dispatcher };
}

describe("CreateCalendarEventUseCase — confirmação de agendamento", () => {
  it("atendimento com e-mail e flag ligada inicia o ciclo na criação e agenda o envio pós-commit", async () => {
    const { useCase, repo, dispatcher } = build(true);

    const created = await useCase.execute(buildFakeInput());

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "ana@example.com",
        confirmation: CONFIRMATION,
      }),
    );
    expect(dispatcher.scheduleConfirmation).toHaveBeenCalledWith(
      created.id,
      "tok-1",
    );
  });

  it("evento que já começou (startsAt no passado) guarda o e-mail, mas não inicia ciclo", async () => {
    const { useCase, repo, dispatcher } = build(true);

    await useCase.execute(
      buildFakeInput({
        startsAt: new Date("2020-01-01T10:00:00.000Z"),
        endsAt: new Date("2020-01-01T11:00:00.000Z"),
      }),
    );

    const data = repo.create.mock.calls[0]?.[0];
    expect(data?.customerEmail).toBe("ana@example.com");
    expect(data?.confirmation).toBeUndefined();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("sem e-mail não inicia ciclo nem envia", async () => {
    const { useCase, repo, dispatcher } = build(true);

    await useCase.execute(buildFakeInput({ customerEmail: null }));

    const data = repo.create.mock.calls[0]?.[0];
    expect(data?.customerEmail).toBeNull();
    expect(data?.confirmation).toBeUndefined();
    expect(dispatcher.buildCycle).not.toHaveBeenCalled();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("flag desligada guarda o e-mail, mas não inicia ciclo (status NULL) nem envia", async () => {
    const { useCase, repo, dispatcher } = build(false);

    const created = await useCase.execute(buildFakeInput());

    const data = repo.create.mock.calls[0]?.[0];
    expect(data?.customerEmail).toBe("ana@example.com");
    expect(data?.confirmation).toBeUndefined();
    expect(created.confirmationStatus).toBeNull();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("indisponibilidade ignora o e-mail", async () => {
    const { useCase, repo, dispatcher } = build(true);

    await useCase.execute(buildFakeInput({ type: "unavailability" }));

    const data = repo.create.mock.calls[0]?.[0];
    expect(data?.customerEmail).toBeNull();
    expect(data?.confirmation).toBeUndefined();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("repassa sourceQuoteRequestId ao repositório", async () => {
    const { useCase, repo } = build(true);

    await useCase.execute(buildFakeInput({ sourceQuoteRequestId: "quote-1" }));

    expect(repo.create.mock.calls[0]?.[0].sourceQuoteRequestId).toBe("quote-1");
  });

  it("sem origem grava sourceQuoteRequestId null", async () => {
    const { useCase, repo } = build(true);

    await useCase.execute(buildFakeInput());

    expect(repo.create.mock.calls[0]?.[0].sourceQuoteRequestId).toBeNull();
  });
});
