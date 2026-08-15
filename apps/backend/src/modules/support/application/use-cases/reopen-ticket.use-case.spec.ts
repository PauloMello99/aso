import { ReopenTicketUseCase } from "./reopen-ticket.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import {
  ITicketCategoryRepository,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketCategoryInvalidException } from "../../domain/exceptions/ticket-category-invalid.exception";
import { SupportNotificationService } from "../support-notification.service";

function buildFakeNotifications(): jest.Mocked<SupportNotificationService> {
  return {
    notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
    notifyAgentResponseAdded: jest.fn().mockResolvedValue(undefined),
    notifyStatusChanged: jest.fn().mockResolvedValue(undefined),
    notifyReopened: jest.fn().mockResolvedValue(undefined),
    notifySlaAlert: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SupportNotificationService>;
}

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  return TicketEntity.fromProps({
    id: "ticket-1",
    orgId: "org-1",
    categoryId: "category-1",
    createdBy: "user-1",
    requesterName: "Cliente Teste",
    requesterEmail: "cliente@example.com",
    subject: "Problema no sistema",
    description: "Descrição detalhada do problema encontrado no sistema.",
    status: "resolved",
    priority: "normal",
    assignedAgentId: "agent-1",
    firstResponseAt: new Date("2026-01-01T00:30:00Z"),
    resolvedAt: new Date("2026-01-01T12:00:00Z"),
    closedAt: null,
    reopenedAt: null,
    slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
    slaResolutionDueAt: new Date("2026-01-02T00:00:00Z"),
    slaFirstResponseBreachedAt: null,
    slaResolutionBreachedAt: new Date("2026-01-02T00:00:00Z"),
    slaWarningNotifiedAt: new Date("2026-01-01T23:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  });
}

function buildCategory(
  overrides: Partial<TicketCategory> = {},
): TicketCategory {
  return {
    id: "category-1",
    systemKey: "billing",
    label: "Financeiro",
    slaFirstResponseMinutes: 60,
    slaResolutionMinutes: 1440,
    enabled: true,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn().mockResolvedValue(buildTicket()),
    findByIdAsAdmin: jest.fn(),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn((ticket: TicketEntity) => Promise.resolve(ticket)),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeTicketCategoryRepo(
  overrides: Partial<jest.Mocked<ITicketCategoryRepository>> = {},
): jest.Mocked<ITicketCategoryRepository> {
  return {
    listEnabled: jest.fn(),
    findById: jest.fn().mockResolvedValue(buildCategory()),
    ...overrides,
  } as unknown as jest.Mocked<ITicketCategoryRepository>;
}

const baseInput = {
  orgId: "org-1",
  ticketId: "ticket-1",
};

describe("ReopenTicketUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest.fn().mockResolvedValue(null),
    });
    const categoryRepo = buildFakeTicketCategoryRepo();
    const useCase = new ReopenTicketUseCase(
      ticketRepo,
      categoryRepo,
      buildFakeNotifications(),
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketCategoryInvalidException quando a categoria não é mais encontrada", async () => {
    const ticketRepo = buildFakeTicketRepo();
    const categoryRepo = buildFakeTicketCategoryRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new ReopenTicketUseCase(
      ticketRepo,
      categoryRepo,
      buildFakeNotifications(),
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketCategoryInvalidException,
    );
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("limpa resolvedAt/closedAt, recalcula slaResolutionDueAt e zera breach/warning ao reabrir", async () => {
    const ticketRepo = buildFakeTicketRepo();
    const categoryRepo = buildFakeTicketCategoryRepo();
    const useCase = new ReopenTicketUseCase(
      ticketRepo,
      categoryRepo,
      buildFakeNotifications(),
    );

    const persisted = await useCase.execute(baseInput);

    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.status).toBe("open");
    expect(updated.resolvedAt).toBeNull();
    expect(updated.closedAt).toBeNull();
    expect(updated.reopenedAt).not.toBeNull();
    expect(updated.slaResolutionBreachedAt).toBeNull();
    expect(updated.slaWarningNotifiedAt).toBeNull();
    // slaFirstResponseDueAt permanece congelado (não recalculado no reopen)
    expect(updated.slaFirstResponseDueAt).toEqual(
      new Date("2026-01-01T01:00:00Z"),
    );
    expect(updated.slaResolutionDueAt.getTime()).toBeGreaterThan(
      new Date("2026-01-02T00:00:00Z").getTime(),
    );
    expect(persisted).toBe(updated);
  });

  it("reabre um ticket fechado (closed)", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(
          buildTicket({ status: "closed", closedAt: new Date() }),
        ),
    });
    const categoryRepo = buildFakeTicketCategoryRepo();
    const useCase = new ReopenTicketUseCase(
      ticketRepo,
      categoryRepo,
      buildFakeNotifications(),
    );

    await useCase.execute(baseInput);

    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.status).toBe("open");
    expect(updated.closedAt).toBeNull();
  });
});
