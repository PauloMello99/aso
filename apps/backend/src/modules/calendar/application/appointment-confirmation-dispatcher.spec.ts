import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../../mail/application/mail.service";
import { CalendarEventEntity } from "../domain/calendar-event.entity";
import type { IAppointmentConfirmationRepository } from "../domain/appointment-confirmation.repository.interface";
import { hashConfirmationToken } from "../domain/confirmation-token";
import { registerPostCommit } from "../../../database/database.module";
import {
  AppointmentConfirmationDispatcher,
  formatWhenLabel,
} from "./appointment-confirmation-dispatcher";

jest.mock("../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

const registerPostCommitMock = registerPostCommit as jest.MockedFunction<
  typeof registerPostCommit
>;

function buildFakeEvent(
  overrides: Partial<{ customerEmail: string | null; allDay: boolean }> = {},
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
    // 14:00 em America/Sao_Paulo (UTC-3), independente do fuso da máquina.
    startsAt: new Date("2026-10-20T17:00:00.000Z"),
    endsAt: new Date("2026-10-20T19:00:00.000Z"),
    allDay: false,
    visibility: "private",
    customerEmail: "ana@example.com",
    confirmationStatus: "pending",
    confirmationRequestedAt: new Date(),
    confirmationSentAt: null,
    confirmationRespondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function buildConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

function buildMail(): jest.Mocked<Pick<MailService, "sendAppointmentConfirmation">> {
  return {
    sendAppointmentConfirmation: jest.fn().mockResolvedValue(true),
  };
}

function buildRepo(): jest.Mocked<IAppointmentConfirmationRepository> {
  return {
    markConfirmationSentByHash: jest.fn().mockResolvedValue(undefined),
    findByTokenHash: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<IAppointmentConfirmationRepository>;
}

function buildDispatcher(
  config: ConfigService,
  mail = buildMail(),
  repo = buildRepo(),
): {
  dispatcher: AppointmentConfirmationDispatcher;
  mail: ReturnType<typeof buildMail>;
  repo: jest.Mocked<IAppointmentConfirmationRepository>;
} {
  const dispatcher = new AppointmentConfirmationDispatcher(
    config,
    mail as unknown as MailService,
    repo,
  );
  return { dispatcher, mail, repo };
}

describe("AppointmentConfirmationDispatcher", () => {
  describe("isEnabled", () => {
    it("é true só com a flag igual a 'true'", () => {
      expect(
        buildDispatcher(
          buildConfig({ APPOINTMENT_CONFIRMATION_ENABLED: "true" }),
        ).dispatcher.isEnabled(),
      ).toBe(true);
      expect(
        buildDispatcher(
          buildConfig({ APPOINTMENT_CONFIRMATION_ENABLED: "false" }),
        ).dispatcher.isEnabled(),
      ).toBe(false);
      expect(buildDispatcher(buildConfig({})).dispatcher.isEnabled()).toBe(false);
    });
  });

  describe("buildCycle", () => {
    it("gera ciclo pendente com hash do token e carimbos zerados", () => {
      const { dispatcher } = buildDispatcher(buildConfig({}));
      const now = new Date("2026-10-08T12:00:00.000Z");

      const { token, confirmation } = dispatcher.buildCycle(now);

      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(confirmation).toEqual({
        status: "pending",
        tokenHash: hashConfirmationToken(token),
        requestedAt: now,
        sentAt: null,
        respondedAt: null,
        customerReminderSentAt: null,
      });
    });

    it("cada chamada gera token diferente", () => {
      const { dispatcher } = buildDispatcher(buildConfig({}));
      const now = new Date();

      expect(dispatcher.buildCycle(now).token).not.toBe(
        dispatcher.buildCycle(now).token,
      );
    });
  });

  describe("sendAndMark", () => {
    const config = (): ConfigService =>
      buildConfig({ FRONTEND_URL: "https://app.example.com" });

    it("envia com o link da página pública e marca confirmation_sent_at", async () => {
      const { dispatcher, mail, repo } = buildDispatcher(config());

      const result = await dispatcher.sendAndMark(
        buildFakeEvent(),
        "tok-123",
        "confirmation",
        "Studio Helena",
      );

      expect(result).toBe(true);
      expect(mail.sendAppointmentConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "ana@example.com",
          kind: "confirmation",
          orgName: "Studio Helena",
          confirmUrl: "https://app.example.com/confirmar-agendamento/tok-123",
          whenLabel: "terça-feira, 20/10 às 14:00",
        }),
      );
      expect(repo.markConfirmationSentByHash).toHaveBeenCalledWith(
        "ev-1",
        hashConfirmationToken("tok-123"),
        expect.any(Date),
      );
    });

    it("dia inteiro: rótulo sem hora", async () => {
      const { dispatcher, mail } = buildDispatcher(config());

      await dispatcher.sendAndMark(
        buildFakeEvent({ allDay: true }),
        "tok",
        "confirmation",
        "O",
      );

      expect(mail.sendAppointmentConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ whenLabel: "terça-feira, 20/10" }),
      );
    });

    it("usa localhost:3000 sem FRONTEND_URL", async () => {
      const { dispatcher, mail } = buildDispatcher(buildConfig({}));

      await dispatcher.sendAndMark(buildFakeEvent(), "tok", "confirmation", "O");

      expect(mail.sendAppointmentConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmUrl: "http://localhost:3000/confirmar-agendamento/tok",
        }),
      );
    });

    it("não marca como enviado quando o MailService retorna false", async () => {
      const mail = buildMail();
      mail.sendAppointmentConfirmation.mockResolvedValue(false);
      const { dispatcher, repo } = buildDispatcher(config(), mail);

      const result = await dispatcher.sendAndMark(
        buildFakeEvent(),
        "tok",
        "confirmation",
        "O",
      );

      expect(result).toBe(false);
      expect(repo.markConfirmationSentByHash).not.toHaveBeenCalled();
    });

    it("lembrete enviado não grava confirmation_sent_at (o job carimba via storeReminderToken)", async () => {
      const { dispatcher, repo } = buildDispatcher(config());

      const result = await dispatcher.sendAndMark(
        buildFakeEvent(),
        "tok",
        "reminder",
        "O",
      );

      expect(result).toBe(true);
      expect(repo.markConfirmationSentByHash).not.toHaveBeenCalled();
    });

    it("engole exceção do MailService, retorna false e loga só o domínio do e-mail", async () => {
      const mail = buildMail();
      mail.sendAppointmentConfirmation.mockRejectedValue(
        new Error("falha para ana@example.com"),
      );
      const { dispatcher, repo } = buildDispatcher(config(), mail);
      const warn = jest
        .spyOn(
          (dispatcher as unknown as { logger: { warn: (message: string) => void } }).logger,
          "warn",
        )
        .mockImplementation(() => undefined);

      await expect(
        dispatcher.sendAndMark(buildFakeEvent(), "tok", "confirmation", "O"),
      ).resolves.toBe(false);

      expect(repo.markConfirmationSentByHash).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      const logged = String(warn.mock.calls[0]?.[0]);
      expect(logged).toContain("@example.com");
      expect(logged).not.toContain("ana@example.com");
    });

    it("sem e-mail do cliente não envia", async () => {
      const { dispatcher, mail } = buildDispatcher(config());

      const result = await dispatcher.sendAndMark(
        buildFakeEvent({ customerEmail: null }),
        "tok",
        "confirmation",
        "O",
      );

      expect(result).toBe(false);
      expect(mail.sendAppointmentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe("scheduleConfirmation", () => {
    beforeEach(() => {
      registerPostCommitMock.mockReset();
    });

    it("não envia no momento do agendamento: só registra o hook pós-COMMIT", () => {
      const { dispatcher, mail, repo } = buildDispatcher(buildConfig({}));

      dispatcher.scheduleConfirmation("ev-1", "tok");

      expect(registerPostCommitMock).toHaveBeenCalledTimes(1);
      expect(repo.findByTokenHash).not.toHaveBeenCalled();
      expect(mail.sendAppointmentConfirmation).not.toHaveBeenCalled();
      expect(repo.markConfirmationSentByHash).not.toHaveBeenCalled();
    });

    async function runHook(
      dispatcher: AppointmentConfirmationDispatcher,
    ): Promise<void> {
      dispatcher.scheduleConfirmation("ev-1", "tok");
      const hook = registerPostCommitMock.mock.calls[0]?.[0];
      void hook?.();
      await new Promise((resolve) => setImmediate(resolve));
    }

    it("ao rodar o hook, relê o ciclo por hash (admin), envia com o nome da org e carimba por hash", async () => {
      const { dispatcher, mail, repo } = buildDispatcher(buildConfig({}));
      repo.findByTokenHash.mockResolvedValue({
        event: buildFakeEvent(),
        orgName: "Studio Helena",
      });

      await runHook(dispatcher);

      expect(repo.findByTokenHash).toHaveBeenCalledWith(
        hashConfirmationToken("tok"),
      );
      expect(mail.sendAppointmentConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ orgName: "Studio Helena" }),
      );
      expect(repo.markConfirmationSentByHash).toHaveBeenCalledWith(
        "ev-1",
        hashConfirmationToken("tok"),
        expect.any(Date),
      );
    });

    it("token não é mais o vigente (ciclo substituído/não commitado): não envia", async () => {
      const { dispatcher, mail, repo } = buildDispatcher(buildConfig({}));
      repo.findByTokenHash.mockResolvedValue(null);

      await runHook(dispatcher);

      expect(mail.sendAppointmentConfirmation).not.toHaveBeenCalled();
      expect(repo.markConfirmationSentByHash).not.toHaveBeenCalled();
    });

    it("erro de banco na releitura não vira rejeição não tratada nem envia", async () => {
      const { dispatcher, mail, repo } = buildDispatcher(buildConfig({}));
      repo.findByTokenHash.mockRejectedValue(new Error("db"));

      await expect(runHook(dispatcher)).resolves.toBeUndefined();

      expect(mail.sendAppointmentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe("formatWhenLabel", () => {
    it("usa America/Sao_Paulo, com e sem hora", () => {
      const startsAt = new Date("2026-10-20T17:00:00.000Z");

      expect(formatWhenLabel(startsAt)).toBe("terça-feira, 20/10 às 14:00");
      expect(formatWhenLabel(startsAt, true)).toBe("terça-feira, 20/10");
    });
  });
});
