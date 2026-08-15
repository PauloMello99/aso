import { CreateTicketUseCase } from "./create-ticket.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import {
  ITicketCategoryRepository,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketCategoryInvalidException } from "../../domain/exceptions/ticket-category-invalid.exception";
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

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn(),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn(),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
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
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  ticketCategoryRepo?: Partial<jest.Mocked<ITicketCategoryRepository>>;
}) {
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const ticketCategoryRepo = buildFakeTicketCategoryRepo(
    overrides?.ticketCategoryRepo,
  );
  const notifications = buildFakeNotifications();
  const useCase = new CreateTicketUseCase(
    ticketRepo,
    ticketCategoryRepo,
    notifications,
  );
  return { useCase, ticketRepo, ticketCategoryRepo, notifications };
}

const baseInput = {
  orgId: "org-1",
  createdBy: "user-1",
  requesterName: "Cliente Teste",
  requesterEmail: "cliente@example.com",
  subject: "Problema no sistema",
  description: "Descrição detalhada do problema encontrado no sistema.",
  categorySystemKey: "billing",
};

describe("CreateTicketUseCase", () => {
  it("lança TicketCategoryInvalidException quando a categoria não existe", async () => {
    const { useCase, ticketRepo, ticketCategoryRepo } = buildUseCase({
      ticketCategoryRepo: { listEnabled: jest.fn().mockResolvedValue([]) },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketCategoryInvalidException,
    );
    expect(ticketCategoryRepo.listEnabled).toHaveBeenCalled();
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketCategoryInvalidException quando a categoria está desabilitada (não retornada por listEnabled)", async () => {
    const { useCase, ticketRepo } = buildUseCase({
      ticketCategoryRepo: {
        listEnabled: jest.fn().mockResolvedValue([
          buildCategory({ systemKey: "other-category" }),
        ]),
      },
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketCategoryInvalidException,
    );
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("cria o ticket com SLA calculado a partir da categoria quando válida", async () => {
    const created = TicketEntity.fromProps({
      id: "ticket-1",
      orgId: "org-1",
      categoryId: "category-1",
      createdBy: "user-1",
      requesterName: "Cliente Teste",
      requesterEmail: "cliente@example.com",
      subject: "Problema no sistema",
      description: "Descrição detalhada do problema encontrado no sistema.",
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

    const { useCase, ticketRepo } = buildUseCase({
      ticketRepo: { createAsAdmin: jest.fn().mockResolvedValue(created) },
    });

    const result = await useCase.execute(baseInput);

    expect(ticketRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        categoryId: "category-1",
        requesterEmail: "cliente@example.com",
        subject: "Problema no sistema",
        status: "open",
      }),
    );

    const persistedTicket = ticketRepo.createAsAdmin.mock
      .calls[0][0] as TicketEntity;
    expect(
      persistedTicket.slaFirstResponseDueAt.getTime() -
        persistedTicket.createdAt.getTime(),
    ).toBe(60 * 60_000);
    expect(
      persistedTicket.slaResolutionDueAt.getTime() -
        persistedTicket.createdAt.getTime(),
    ).toBe(1440 * 60_000);

    expect(result).toBe(created);
  });
});
