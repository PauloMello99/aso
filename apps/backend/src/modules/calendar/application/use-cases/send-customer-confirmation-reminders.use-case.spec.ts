import { CalendarEventEntity } from "../../domain/calendar-event.entity";
import type {
  DueCustomerReminder,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import { hashConfirmationToken } from "../../domain/confirmation-token";
import type { AppointmentConfirmationDispatcher } from "../appointment-confirmation-dispatcher";
import { SendCustomerConfirmationRemindersUseCase } from "./send-customer-confirmation-reminders.use-case";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

const REQUESTED_AT = new Date("2026-10-01T12:00:00.000Z");

function buildFakeDue(id: string): DueCustomerReminder {
  return {
    orgName: "Studio Helena",
    requestedAt: REQUESTED_AT,
    event: CalendarEventEntity.create({
      id,
      orgId: "org-1",
      assignedTo: "user-1",
      customerId: null,
      createdBy: "user-1",
      type: "appointment",
      status: "scheduled",
      title: "Tattoo",
      description: null,
      startsAt: new Date("2026-10-20T17:00:00.000Z"),
      endsAt: new Date("2026-10-20T19:00:00.000Z"),
      allDay: false,
      visibility: "private",
      customerEmail: `${id}@example.com`,
      confirmationStatus: "pending",
      confirmationRequestedAt: new Date("2026-10-01T12:00:00.000Z"),
      confirmationSentAt: new Date("2026-10-01T12:00:05.000Z"),
      confirmationRespondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
}

function build(options: { enabled?: boolean; due?: DueCustomerReminder[] } = {}) {
  const repo = {
    findDueCustomerReminders: jest.fn().mockResolvedValue(options.due ?? []),
    claimCustomerReminder: jest.fn().mockResolvedValue(true),
    storeReminderToken: jest.fn().mockResolvedValue(true),
    releaseCustomerReminder: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IAppointmentConfirmationRepository>;
  const dispatcher = {
    isEnabled: jest.fn().mockReturnValue(options.enabled ?? true),
    sendAndMark: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<AppointmentConfirmationDispatcher>;
  return {
    useCase: new SendCustomerConfirmationRemindersUseCase(repo, dispatcher),
    repo,
    dispatcher,
  };
}

describe("SendCustomerConfirmationRemindersUseCase", () => {
  it("flag desligada não faz nada", async () => {
    const { useCase, repo, dispatcher } = build({ enabled: false });

    await expect(useCase.execute()).resolves.toEqual({
      sent: 0,
      skipped: "disabled",
    });
    expect(repo.findDueCustomerReminders).not.toHaveBeenCalled();
    expect(dispatcher.sendAndMark).not.toHaveBeenCalled();
  });

  it("busca na janela de 24h com limite 200", async () => {
    const { useCase, repo } = build();

    await useCase.execute();

    const [now, until, limit] = repo.findDueCustomerReminders.mock.calls[0] ?? [];
    expect(limit).toBe(200);
    expect(until!.getTime() - now!.getTime()).toBe(24 * 3_600_000);
  });

  it("claim false pula o evento sem enviar", async () => {
    const { useCase, repo, dispatcher } = build({ due: [buildFakeDue("a")] });
    repo.claimCustomerReminder.mockResolvedValue(false);

    await expect(useCase.execute()).resolves.toEqual({ sent: 0 });
    expect(dispatcher.sendAndMark).not.toHaveBeenCalled();
    expect(repo.storeReminderToken).not.toHaveBeenCalled();
    expect(repo.releaseCustomerReminder).not.toHaveBeenCalled();
  });

  it("claim é preso ao snapshot do findDue (now, until da janela e requestedAt)", async () => {
    const { useCase, repo } = build({ due: [buildFakeDue("a")] });

    await useCase.execute();

    const [id, now, until, requestedAt] =
      repo.claimCustomerReminder.mock.calls[0] ?? [];
    const [dueNow, dueUntil] = repo.findDueCustomerReminders.mock.calls[0] ?? [];
    expect(id).toBe("a");
    expect(now).toBe(dueNow);
    expect(until).toBe(dueUntil);
    expect(requestedAt).toBe(REQUESTED_AT);
  });

  it("claim falha por mudança de ciclo (reagendado após o findDue): não envia nem grava nem libera", async () => {
    const { useCase, repo, dispatcher } = build({
      due: [buildFakeDue("a"), buildFakeDue("b")],
    });
    repo.claimCustomerReminder
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(useCase.execute()).resolves.toEqual({ sent: 1 });
    expect(dispatcher.sendAndMark).toHaveBeenCalledTimes(1);
    expect(dispatcher.sendAndMark.mock.calls[0]?.[0].id).toBe("b");
    expect(repo.releaseCustomerReminder).not.toHaveBeenCalled();
  });

  it("envio confirmado grava o hash do token enviado", async () => {
    const { useCase, repo, dispatcher } = build({ due: [buildFakeDue("a")] });

    await expect(useCase.execute()).resolves.toEqual({ sent: 1 });

    const [, token, kind, orgName] = dispatcher.sendAndMark.mock.calls[0] ?? [];
    expect(kind).toBe("reminder");
    expect(orgName).toBe("Studio Helena");
    const claimedAt = repo.claimCustomerReminder.mock.calls[0]?.[1];
    expect(claimedAt).toBeInstanceOf(Date);
    expect(repo.storeReminderToken).toHaveBeenCalledWith(
      "a",
      hashConfirmationToken(token as string),
      claimedAt,
      expect.any(Date),
    );
    expect(repo.releaseCustomerReminder).not.toHaveBeenCalled();
  });

  it("envio não confirmado (false) não grava hash e libera a reserva para o próximo tick", async () => {
    const { useCase, repo, dispatcher } = build({ due: [buildFakeDue("a")] });
    dispatcher.sendAndMark.mockResolvedValue(false);

    await expect(useCase.execute()).resolves.toEqual({ sent: 0 });
    expect(repo.storeReminderToken).not.toHaveBeenCalled();
    expect(repo.releaseCustomerReminder).toHaveBeenCalledWith(
      "a",
      repo.claimCustomerReminder.mock.calls[0]?.[1],
    );
  });

  it("compare-and-swap falho (evento mudou após o claim) não conta como enviado nem libera a reserva", async () => {
    const { useCase, repo } = build({ due: [buildFakeDue("a")] });
    repo.storeReminderToken.mockResolvedValue(false);

    await expect(useCase.execute()).resolves.toEqual({ sent: 0 });
    expect(repo.storeReminderToken).toHaveBeenCalledTimes(1);
    expect(repo.releaseCustomerReminder).not.toHaveBeenCalled();
  });

  it("erro ao gravar o hash depois do e-mail enviado não libera a reserva (evita duplicar) e loga error sem PII", async () => {
    const { useCase, repo } = build({ due: [buildFakeDue("a")] });
    repo.storeReminderToken.mockRejectedValue(new Error("db ana@example.com"));
    const error = jest
      .spyOn(
        (useCase as unknown as { logger: { error: (message: string) => void } })
          .logger,
        "error",
      )
      .mockImplementation(() => undefined);

    await expect(useCase.execute()).resolves.toEqual({ sent: 0 });
    expect(repo.releaseCustomerReminder).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    const logged = String(error.mock.calls[0]?.[0]);
    expect(logged).toContain("a");
    expect(logged).not.toContain("example.com");
  });

  it("erro em um evento não interrompe os outros", async () => {
    const { useCase, repo, dispatcher } = build({
      due: [buildFakeDue("a"), buildFakeDue("b")],
    });
    dispatcher.sendAndMark
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(true);

    await expect(useCase.execute()).resolves.toEqual({ sent: 1 });
    expect(repo.storeReminderToken).toHaveBeenCalledTimes(1);
    expect(repo.storeReminderToken).toHaveBeenCalledWith(
      "b",
      expect.any(String),
      expect.any(Date),
      expect.any(Date),
    );
    expect(repo.releaseCustomerReminder).toHaveBeenCalledWith("a", expect.any(Date));
  });
});
