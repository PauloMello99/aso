import { AddAgentResponseUseCase } from "./add-agent-response.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { ITicketResponseRepository } from "../../domain/ticket-response.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
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
    status: "in_progress",
    priority: "normal",
    assignedAgentId: "agent-1",
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
    ...overrides,
  });
}

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn(),
    findByIdAsAdmin: jest.fn().mockResolvedValue(buildTicket()),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn((ticket: TicketEntity) => Promise.resolve(ticket)),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeTicketResponseRepo(
  overrides: Partial<jest.Mocked<ITicketResponseRepository>> = {},
): jest.Mocked<ITicketResponseRepository> {
  return {
    createAsAdmin: jest.fn((response: TicketResponseEntity) =>
      Promise.resolve(response),
    ),
    listByTicketInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketResponseRepository>;
}

const baseInput = {
  ticketId: "ticket-1",
  agentUserId: "agent-1",
  body: "Resposta do agente",
  isInternalNote: false,
};

describe("AddAgentResponseUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest.fn().mockResolvedValue(null),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddAgentResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
      buildFakeNotifications(),
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(ticketResponseRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("não marca firstResponseAt quando isInternalNote=true", async () => {
    const ticketRepo = buildFakeTicketRepo();
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddAgentResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
      buildFakeNotifications(),
    );

    await useCase.execute({ ...baseInput, isInternalNote: true });

    expect(ticketResponseRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ authorType: "agent", isInternalNote: true }),
    );
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("não atualiza o ticket quando firstResponseAt já está setado", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest
        .fn()
        .mockResolvedValue(buildTicket({ firstResponseAt: new Date() })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddAgentResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
      buildFakeNotifications(),
    );

    await useCase.execute(baseInput);

    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("marca firstResponseAt quando resposta pública e ainda não havia primeira resposta", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest
        .fn()
        .mockResolvedValue(buildTicket({ firstResponseAt: null })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddAgentResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
      buildFakeNotifications(),
    );

    await useCase.execute(baseInput);

    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.firstResponseAt).not.toBeNull();
  });
});
