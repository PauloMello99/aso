import {
  CalendarEventEntity,
  type CalendarEventProps,
  type UpdateCalendarEventData,
} from "../../domain/calendar-event.entity";
import type { ICalendarEventRepository } from "../../domain/calendar-event.repository.interface";
import { EventForbiddenException } from "../../domain/exceptions/event-forbidden.exception";
import type { AppointmentConfirmationDispatcher } from "../appointment-confirmation-dispatcher";
import { UpdateCalendarEventUseCase } from "./update-calendar-event.use-case";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

// Bem no futuro: o ciclo só começa com startsAt > now.
const STARTS_AT = new Date("2099-10-20T17:00:00.000Z");
const ENDS_AT = new Date("2099-10-20T19:00:00.000Z");

function buildFakeEvent(
  overrides: Partial<CalendarEventProps> = {},
): CalendarEventEntity {
  return CalendarEventEntity.create({
    id: "ev-1",
    orgId: "org-1",
    assignedTo: "user-1",
    customerId: null,
    createdBy: "user-1",
    type: "appointment",
    status: "scheduled",
    title: "Tattoo",
    description: null,
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    allDay: false,
    visibility: "private",
    customerEmail: "ana@example.com",
    confirmationStatus: "confirmed",
    confirmationRequestedAt: new Date("2026-10-01T12:00:00.000Z"),
    confirmationSentAt: new Date("2026-10-01T12:00:05.000Z"),
    confirmationRespondedAt: new Date("2026-10-02T12:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function build(options: { enabled?: boolean; existing?: CalendarEventEntity } = {}) {
  const existing = options.existing ?? buildFakeEvent();
  const repo = {
    getMembership: jest
      .fn()
      .mockResolvedValue({ userId: "user-1", role: "employee", name: "Helena" }),
    findById: jest.fn().mockResolvedValue(existing),
    hasOverlap: jest.fn().mockResolvedValue(false),
    update: jest.fn((_id: string, data: UpdateCalendarEventData) =>
      Promise.resolve(
        buildFakeEvent({
          ...(data.type && { type: data.type }),
          ...(data.customerEmail !== undefined && {
            customerEmail: data.customerEmail,
          }),
        }),
      ),
    ),
  } as unknown as jest.Mocked<ICalendarEventRepository>;
  const dispatcher = {
    isEnabled: jest.fn().mockReturnValue(options.enabled ?? true),
    buildCycle: jest.fn().mockReturnValue({
      token: "tok-2",
      confirmation: {
        status: "pending",
        tokenHash: "hash-2",
        requestedAt: new Date("2026-10-08T12:00:00.000Z"),
        sentAt: null,
        respondedAt: null,
        customerReminderSentAt: null,
      },
    }),
    scheduleConfirmation: jest.fn(),
  } as unknown as jest.Mocked<AppointmentConfirmationDispatcher>;
  return {
    useCase: new UpdateCalendarEventUseCase(repo, dispatcher),
    repo,
    dispatcher,
  };
}

const base = { id: "ev-1", orgId: "org-1", authId: "auth-1" };

describe("UpdateCalendarEventUseCase — confirmação de agendamento", () => {
  it("alterar só o título não toca na confirmação nem reenvia", async () => {
    const { useCase, repo, dispatcher } = build();

    await useCase.execute({ ...base, title: "Novo título" });

    const data = repo.update.mock.calls[0]?.[1];
    expect(data?.confirmation).toBeUndefined();
    expect(data?.customerEmail).toBeUndefined();
    expect(dispatcher.buildCycle).not.toHaveBeenCalled();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("startsAt diferente gera token novo, volta para pending e agenda o reenvio pós-commit", async () => {
    const { useCase, repo, dispatcher } = build();

    await useCase.execute({
      ...base,
      startsAt: new Date("2099-10-21T17:00:00.000Z"),
      endsAt: new Date("2099-10-21T19:00:00.000Z"),
    });

    const data = repo.update.mock.calls[0]?.[1];
    expect(data?.confirmation).toMatchObject({
      status: "pending",
      tokenHash: "hash-2",
      respondedAt: null,
    });
    expect(dispatcher.scheduleConfirmation).toHaveBeenCalledWith(
      "ev-1",
      "tok-2",
    );
  });

  it("reagendar para o passado não inicia ciclo", async () => {
    const { useCase, repo, dispatcher } = build();

    await useCase.execute({
      ...base,
      startsAt: new Date("2020-01-01T10:00:00.000Z"),
      endsAt: new Date("2020-01-01T11:00:00.000Z"),
    });

    expect(repo.update.mock.calls[0]?.[1].confirmation).toBeUndefined();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("troca de e-mail reinicia o ciclo e reenvia", async () => {
    const { useCase, repo, dispatcher } = build();

    await useCase.execute({ ...base, customerEmail: " Bia@Example.com" });

    const data = repo.update.mock.calls[0]?.[1];
    expect(data?.customerEmail).toBe("bia@example.com");
    expect(data?.confirmation?.status).toBe("pending");
    expect(dispatcher.scheduleConfirmation).toHaveBeenCalledTimes(1);
  });

  it("mesmo e-mail com caixa diferente não reinicia o ciclo", async () => {
    const { useCase, dispatcher } = build();

    await useCase.execute({ ...base, customerEmail: "ANA@example.com" });

    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("mudar o tipo para unavailability limpa e-mail e confirmação", async () => {
    const { useCase, repo, dispatcher } = build();

    await useCase.execute({ ...base, type: "unavailability" });

    const data = repo.update.mock.calls[0]?.[1];
    expect(data?.customerEmail).toBeNull();
    expect(data?.confirmation).toEqual({
      status: null,
      tokenHash: null,
      requestedAt: null,
      sentAt: null,
      respondedAt: null,
      customerReminderSentAt: null,
    });
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("remover o e-mail limpa a confirmação", async () => {
    const { useCase, repo } = build();

    await useCase.execute({ ...base, customerEmail: null });

    const data = repo.update.mock.calls[0]?.[1];
    expect(data?.customerEmail).toBeNull();
    expect(data?.confirmation?.status).toBeNull();
    expect(data?.confirmation?.tokenHash).toBeNull();
  });

  it("flag desligada: reagendar limpa o ciclo antigo (sem token/status vivos) e não envia", async () => {
    const { useCase, repo, dispatcher } = build({ enabled: false });

    await useCase.execute({
      ...base,
      startsAt: new Date("2099-10-21T17:00:00.000Z"),
      endsAt: new Date("2099-10-21T19:00:00.000Z"),
    });

    expect(repo.update.mock.calls[0]?.[1].confirmation).toEqual({
      status: null,
      tokenHash: null,
      requestedAt: null,
      sentAt: null,
      respondedAt: null,
      customerReminderSentAt: null,
    });
    expect(dispatcher.buildCycle).not.toHaveBeenCalled();
    expect(dispatcher.scheduleConfirmation).not.toHaveBeenCalled();
  });

  it("quem não é o assignedTo recebe forbidden e nada é gravado", async () => {
    const { useCase, repo } = build({
      existing: buildFakeEvent({ assignedTo: "outro-user" }),
    });

    await expect(
      useCase.execute({ ...base, customerEmail: "bia@example.com" }),
    ).rejects.toBeInstanceOf(EventForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
