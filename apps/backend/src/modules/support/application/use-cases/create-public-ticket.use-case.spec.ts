import { CreatePublicTicketUseCase } from "./create-public-ticket.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import {
  ITicketCategoryRepository,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";
import { ICaptchaVerifier } from "../../domain/ports/captcha-verifier.port";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketCategoryInvalidException } from "../../domain/exceptions/ticket-category-invalid.exception";
import { CaptchaVerificationFailedException } from "../../domain/exceptions/captcha-verification-failed.exception";
import { SupportNotificationService } from "../support-notification.service";

function buildCategory(overrides: Partial<TicketCategory> = {}): TicketCategory {
  return {
    id: "category-1",
    systemKey: "billing",
    label: "Cobrança",
    slaFirstResponseMinutes: 60,
    slaResolutionMinutes: 1440,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeCaptchaVerifier(
  overrides: Partial<jest.Mocked<ICaptchaVerifier>> = {},
): jest.Mocked<ICaptchaVerifier> {
  return {
    verify: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICaptchaVerifier>;
}

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn(),
    findByIdAsAdmin: jest.fn(),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn(),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    findOrgById: jest.fn(),
    linkToOrganization: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeTicketCategoryRepo(
  overrides: Partial<jest.Mocked<ITicketCategoryRepository>> = {},
): jest.Mocked<ITicketCategoryRepository> {
  return {
    listEnabled: jest.fn().mockResolvedValue([buildCategory()]),
    findById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketCategoryRepository>;
}

function buildFakeNotifications(): jest.Mocked<SupportNotificationService> {
  return {
    notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
    notifyAgentResponseAdded: jest.fn().mockResolvedValue(undefined),
    notifyStatusChanged: jest.fn().mockResolvedValue(undefined),
    notifyReopened: jest.fn().mockResolvedValue(undefined),
    notifySlaAlert: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SupportNotificationService>;
}

function buildUseCase(overrides?: {
  captchaVerifier?: Partial<jest.Mocked<ICaptchaVerifier>>;
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  ticketCategoryRepo?: Partial<jest.Mocked<ITicketCategoryRepository>>;
}) {
  const captchaVerifier = buildFakeCaptchaVerifier(overrides?.captchaVerifier);
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const ticketCategoryRepo = buildFakeTicketCategoryRepo(
    overrides?.ticketCategoryRepo,
  );
  const notifications = buildFakeNotifications();
  const useCase = new CreatePublicTicketUseCase(
    captchaVerifier,
    ticketRepo,
    ticketCategoryRepo,
    notifications,
  );
  return {
    useCase,
    captchaVerifier,
    ticketRepo,
    ticketCategoryRepo,
    notifications,
  };
}

const baseInput = {
  requesterName: "Visitante Anônimo",
  requesterEmail: "visitante@example.com",
  subject: "Dúvida sobre o produto",
  description: "Gostaria de saber mais sobre os planos disponíveis.",
  categorySystemKey: "billing",
  captchaToken: "valid-token",
  remoteIp: "127.0.0.1",
};

describe("CreatePublicTicketUseCase", () => {
  it("lança CaptchaVerificationFailedException quando o captcha é inválido e não toca no banco", async () => {
    const { useCase, ticketRepo, ticketCategoryRepo } = buildUseCase({
      captchaVerifier: { verify: jest.fn().mockResolvedValue(false) },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      CaptchaVerificationFailedException,
    );
    expect(ticketCategoryRepo.listEnabled).not.toHaveBeenCalled();
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketCategoryInvalidException quando a categoria não existe", async () => {
    const { useCase, ticketRepo } = buildUseCase({
      ticketCategoryRepo: { listEnabled: jest.fn().mockResolvedValue([]) },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketCategoryInvalidException,
    );
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketCategoryInvalidException quando a categoria está desabilitada (não retornada por listEnabled)", async () => {
    const { useCase, ticketRepo } = buildUseCase({
      ticketCategoryRepo: {
        listEnabled: jest
          .fn()
          .mockResolvedValue([buildCategory({ systemKey: "other-category" })]),
      },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketCategoryInvalidException,
    );
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("cria o ticket órfão (orgId null, createdBy null) quando captcha e categoria são válidos, e notifica", async () => {
    const created = TicketEntity.fromProps({
      id: "ticket-1",
      orgId: null,
      categoryId: "category-1",
      createdBy: null,
      requesterName: "Visitante Anônimo",
      requesterEmail: "visitante@example.com",
      subject: "Dúvida sobre o produto",
      description: "Gostaria de saber mais sobre os planos disponíveis.",
      status: "open",
      priority: "normal",
      assignedAgentId: null,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenedAt: null,
      slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-02T00:00:00Z"),
      slaFirstResponseBreachedAt: null,
      slaResolutionBreachedAt: null,
      slaWarningNotifiedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const { useCase, ticketRepo, captchaVerifier, notifications } =
      buildUseCase({
        ticketRepo: { createAsAdmin: jest.fn().mockResolvedValue(created) },
      });

    const result = await useCase.execute(baseInput);

    expect(captchaVerifier.verify).toHaveBeenCalledWith(
      "valid-token",
      "127.0.0.1",
    );
    expect(ticketRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: null,
        createdBy: null,
        categoryId: "category-1",
        requesterEmail: "visitante@example.com",
        priority: "normal",
        status: "open",
      }),
    );
    expect(notifications.notifyTicketCreated).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });
});
