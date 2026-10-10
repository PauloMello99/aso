import { NotificationService } from "../../../notifications/application/notification.service";
import type {
  AppointmentConfirmationView,
  IAppointmentConfirmationRepository,
} from "../../domain/appointment-confirmation.repository.interface";
import {
  CalendarEventEntity,
  CalendarEventConfirmationStatus,
  CalendarEventStatus,
} from "../../domain/calendar-event.entity";
import {
  generateConfirmationToken,
  hashConfirmationToken,
} from "../../domain/confirmation-token";
import { AppointmentConfirmationClosedException } from "../../domain/exceptions/appointment-confirmation-closed.exception";
import { AppointmentConfirmationExpiredException } from "../../domain/exceptions/appointment-confirmation-expired.exception";
import { AppointmentConfirmationNotFoundException } from "../../domain/exceptions/appointment-confirmation-not-found.exception";
import { GetAppointmentConfirmationByTokenUseCase } from "./get-appointment-confirmation-by-token.use-case";
import { RespondAppointmentConfirmationUseCase } from "./respond-appointment-confirmation.use-case";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

const NOW = new Date("2026-10-18T12:00:00.000Z");

function buildFakeView(
  overrides: {
    status?: CalendarEventStatus;
    confirmationStatus?: CalendarEventConfirmationStatus | null;
    startsAt?: Date;
  } = {},
): AppointmentConfirmationView {
  return {
    orgName: "Studio Helena",
    event: CalendarEventEntity.create({
      id: "event-1",
      orgId: "org-1",
      assignedTo: "user-1",
      customerId: "customer-1",
      createdBy: "user-1",
      type: "appointment",
      status: overrides.status ?? "scheduled",
      title: "Tattoo da Maria",
      description: null,
      startsAt: overrides.startsAt ?? new Date("2026-10-20T17:00:00.000Z"),
      endsAt: new Date("2026-10-20T19:00:00.000Z"),
      allDay: false,
      visibility: "private",
      customerEmail: "maria@example.com",
      confirmationStatus: overrides.confirmationStatus ?? "pending",
      confirmationRequestedAt: new Date("2026-10-01T12:00:00.000Z"),
      confirmationSentAt: new Date("2026-10-01T12:00:05.000Z"),
      confirmationRespondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
}

function buildRepo() {
  return {
    findByTokenHash: jest.fn(),
    recordResponse: jest.fn(),
  } as unknown as jest.Mocked<IAppointmentConfirmationRepository>;
}

describe("Confirmação pública de agendamento", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("GetAppointmentConfirmationByTokenUseCase", () => {
    it("token malformado => NotFound sem tocar o repo", async () => {
      const repo = buildRepo();
      const useCase = new GetAppointmentConfirmationByTokenUseCase(repo);

      await expect(useCase.execute("curto")).rejects.toBeInstanceOf(
        AppointmentConfirmationNotFoundException,
      );
      expect(repo.findByTokenHash).not.toHaveBeenCalled();
    });

    it("token desconhecido => NotFound, consultando pelo hash", async () => {
      const repo = buildRepo();
      repo.findByTokenHash.mockResolvedValue(null);
      const token = generateConfirmationToken();
      const useCase = new GetAppointmentConfirmationByTokenUseCase(repo);

      await expect(useCase.execute(token)).rejects.toBeInstanceOf(
        AppointmentConfirmationNotFoundException,
      );
      expect(repo.findByTokenHash).toHaveBeenCalledWith(
        hashConfirmationToken(token),
      );
      expect(repo.findByTokenHash).not.toHaveBeenCalledWith(token);
    });

    it("evento já iniciado => Expired", async () => {
      const repo = buildRepo();
      repo.findByTokenHash.mockResolvedValue(buildFakeView({ startsAt: NOW }));
      const useCase = new GetAppointmentConfirmationByTokenUseCase(repo);

      await expect(
        useCase.execute(generateConfirmationToken()),
      ).rejects.toBeInstanceOf(AppointmentConfirmationExpiredException);
    });

    it("evento cancelado => state event_canceled", async () => {
      const repo = buildRepo();
      repo.findByTokenHash.mockResolvedValue(
        buildFakeView({ status: "canceled" }),
      );
      const useCase = new GetAppointmentConfirmationByTokenUseCase(repo);

      const result = await useCase.execute(generateConfirmationToken());

      expect(result.state).toBe("event_canceled");
    });

    it("payload aberto expõe só os campos públicos", async () => {
      const repo = buildRepo();
      repo.findByTokenHash.mockResolvedValue(buildFakeView());
      const useCase = new GetAppointmentConfirmationByTokenUseCase(repo);

      const result = await useCase.execute(generateConfirmationToken());

      expect(result).toEqual({
        orgName: "Studio Helena",
        startsAt: new Date("2026-10-20T17:00:00.000Z"),
        endsAt: new Date("2026-10-20T19:00:00.000Z"),
        allDay: false,
        confirmationStatus: "pending",
        state: "open",
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("Tattoo da Maria");
      expect(serialized).not.toContain("maria@example.com");
      expect(serialized).not.toContain("Maria Cliente");
      expect(serialized).not.toContain("event-1");
    });
  });

  describe("RespondAppointmentConfirmationUseCase", () => {
    function build() {
      const repo = buildRepo();
      const notifications = {
        notify: jest.fn().mockResolvedValue({}),
      } as unknown as jest.Mocked<NotificationService>;
      return {
        repo,
        notifications,
        useCase: new RespondAppointmentConfirmationUseCase(
          repo,
          notifications,
        ),
      };
    }

    it("token malformado => NotFound sem tocar o repo", async () => {
      const { useCase, repo } = build();

      await expect(
        useCase.execute({ token: "x".repeat(10), response: "confirmed" }),
      ).rejects.toBeInstanceOf(AppointmentConfirmationNotFoundException);
      expect(repo.findByTokenHash).not.toHaveBeenCalled();
      expect(repo.recordResponse).not.toHaveBeenCalled();
    });

    it("token desconhecido => NotFound", async () => {
      const { useCase, repo } = build();
      repo.findByTokenHash.mockResolvedValue(null);

      await expect(
        useCase.execute({
          token: generateConfirmationToken(),
          response: "confirmed",
        }),
      ).rejects.toBeInstanceOf(AppointmentConfirmationNotFoundException);
      expect(repo.recordResponse).not.toHaveBeenCalled();
    });

    it("evento iniciado => Expired", async () => {
      const { useCase, repo } = build();
      repo.findByTokenHash.mockResolvedValue(buildFakeView({ startsAt: NOW }));

      await expect(
        useCase.execute({
          token: generateConfirmationToken(),
          response: "confirmed",
        }),
      ).rejects.toBeInstanceOf(AppointmentConfirmationExpiredException);
      expect(repo.recordResponse).not.toHaveBeenCalled();
    });

    it("evento cancelado => Closed", async () => {
      const { useCase, repo } = build();
      repo.findByTokenHash.mockResolvedValue(
        buildFakeView({ status: "canceled" }),
      );

      await expect(
        useCase.execute({
          token: generateConfirmationToken(),
          response: "confirmed",
        }),
      ).rejects.toBeInstanceOf(AppointmentConfirmationClosedException);
      expect(repo.recordResponse).not.toHaveBeenCalled();
    });

    it("primeira resposta grava pelo hash e notifica o profissional sem e-mail", async () => {
      const { useCase, repo, notifications } = build();
      const token = generateConfirmationToken();
      repo.findByTokenHash
        .mockResolvedValueOnce(buildFakeView())
        .mockResolvedValueOnce(buildFakeView({ confirmationStatus: "confirmed" }));
      repo.recordResponse.mockResolvedValue(true);

      const result = await useCase.execute({ token, response: "confirmed" });

      expect(repo.recordResponse).toHaveBeenCalledWith(
        "event-1",
        hashConfirmationToken(token),
        "confirmed",
        NOW,
      );
      expect(repo.recordResponse).not.toHaveBeenCalledWith(
        expect.anything(),
        token,
        expect.anything(),
        expect.anything(),
      );
      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          orgId: "org-1",
          type: "appointment_confirmation_response",
          title: "Cliente confirmou presença",
          data: { eventId: "event-1" },
          email: false,
        }),
      );
      expect(result.confirmationStatus).toBe("confirmed");
      expect(result.state).toBe("open");
    });

    it("mesma resposta repetida não notifica e devolve o payload atual", async () => {
      const { useCase, repo, notifications } = build();
      repo.findByTokenHash.mockResolvedValue(
        buildFakeView({ confirmationStatus: "confirmed" }),
      );
      repo.recordResponse.mockResolvedValue(false);

      const result = await useCase.execute({
        token: generateConfirmationToken(),
        response: "confirmed",
      });

      expect(notifications.notify).not.toHaveBeenCalled();
      expect(result.confirmationStatus).toBe("confirmed");
    });

    it("troca confirmed -> canceled_by_customer notifica", async () => {
      const { useCase, repo, notifications } = build();
      repo.findByTokenHash
        .mockResolvedValueOnce(buildFakeView({ confirmationStatus: "confirmed" }))
        .mockResolvedValueOnce(
          buildFakeView({ confirmationStatus: "canceled_by_customer" }),
        );
      repo.recordResponse.mockResolvedValue(true);

      const result = await useCase.execute({
        token: generateConfirmationToken(),
        response: "canceled_by_customer",
      });

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cliente avisou que não poderá ir",
          email: false,
        }),
      );
      expect(result.confirmationStatus).toBe("canceled_by_customer");
    });

    it("falha do notify não quebra a resposta", async () => {
      const { useCase, repo, notifications } = build();
      repo.findByTokenHash
        .mockResolvedValueOnce(buildFakeView())
        .mockResolvedValueOnce(buildFakeView({ confirmationStatus: "confirmed" }));
      repo.recordResponse.mockResolvedValue(true);
      notifications.notify.mockRejectedValue(new Error("db down"));

      await expect(
        useCase.execute({
          token: generateConfirmationToken(),
          response: "confirmed",
        }),
      ).resolves.toMatchObject({ confirmationStatus: "confirmed" });
    });

    it("corrida: gravação não aplicada e estado divergente => Expired/Closed", async () => {
      const { useCase, repo, notifications } = build();
      repo.findByTokenHash
        .mockResolvedValueOnce(buildFakeView())
        .mockResolvedValueOnce(buildFakeView({ status: "canceled" }));
      repo.recordResponse.mockResolvedValue(false);

      await expect(
        useCase.execute({
          token: generateConfirmationToken(),
          response: "confirmed",
        }),
      ).rejects.toBeInstanceOf(AppointmentConfirmationClosedException);
      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });
});
