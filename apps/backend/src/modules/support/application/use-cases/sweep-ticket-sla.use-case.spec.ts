import { SweepTicketSlaUseCase } from "./sweep-ticket-sla.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
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

const NOW = new Date("2026-01-01T12:00:00Z");

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
    status: "open",
    priority: "normal",
    assignedAgentId: null,
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    reopenedAt: null,
    slaFirstResponseDueAt: new Date("2026-01-02T00:00:00Z"),
    slaResolutionDueAt: new Date("2026-01-03T00:00:00Z"),
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
    findByIdAsAdmin: jest.fn(),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn((ticket: TicketEntity) => Promise.resolve(ticket)),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

describe("SweepTicketSlaUseCase", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marca slaFirstResponseBreachedAt quando o SLA de primeira resposta venceu sem resposta", async () => {
    const ticket = buildTicket({
      firstResponseAt: null,
      slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-05T00:00:00Z"),
    });
    const ticketRepo = buildFakeTicketRepo({
      listSlaCandidates: jest.fn().mockResolvedValue([ticket]),
    });
    const useCase = new SweepTicketSlaUseCase(
      ticketRepo,
      buildFakeNotifications(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, breached: 1, warned: 0, errors: 0 });
    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.slaFirstResponseBreachedAt).toEqual(NOW);
  });

  it("marca slaResolutionBreachedAt quando o SLA de resolução venceu sem resolução/fechamento", async () => {
    const ticket = buildTicket({
      firstResponseAt: new Date("2026-01-01T00:30:00Z"),
      resolvedAt: null,
      closedAt: null,
      slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-01T02:00:00Z"),
    });
    const ticketRepo = buildFakeTicketRepo({
      listSlaCandidates: jest.fn().mockResolvedValue([ticket]),
    });
    const useCase = new SweepTicketSlaUseCase(
      ticketRepo,
      buildFakeNotifications(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, breached: 1, warned: 0, errors: 0 });
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.slaResolutionBreachedAt).toEqual(NOW);
  });

  it("marca slaWarningNotifiedAt quando o ticket está perto de vencer mas ainda não venceu", async () => {
    const ticket = buildTicket({
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      slaFirstResponseDueAt: new Date("2026-01-01T13:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-10T00:00:00Z"),
    });
    const ticketRepo = buildFakeTicketRepo({
      listSlaCandidates: jest.fn().mockResolvedValue([ticket]),
    });
    const useCase = new SweepTicketSlaUseCase(
      ticketRepo,
      buildFakeNotifications(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, breached: 0, warned: 1, errors: 0 });
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.slaWarningNotifiedAt).toEqual(NOW);
  });

  it("não duplica o warning quando slaWarningNotifiedAt já foi setado", async () => {
    const ticket = buildTicket({
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      slaFirstResponseDueAt: new Date("2026-01-01T13:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-10T00:00:00Z"),
      slaWarningNotifiedAt: new Date("2026-01-01T11:00:00Z"),
    });
    const ticketRepo = buildFakeTicketRepo({
      listSlaCandidates: jest.fn().mockResolvedValue([ticket]),
    });
    const useCase = new SweepTicketSlaUseCase(
      ticketRepo,
      buildFakeNotifications(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, breached: 0, warned: 0, errors: 0 });
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("não persiste nada quando o ticket não tem breach nem warning", async () => {
    const ticket = buildTicket({
      firstResponseAt: new Date("2026-01-01T00:10:00Z"),
      resolvedAt: null,
      closedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      slaFirstResponseDueAt: new Date("2026-01-01T01:00:00Z"),
      slaResolutionDueAt: new Date("2026-01-10T00:00:00Z"),
    });
    const ticketRepo = buildFakeTicketRepo({
      listSlaCandidates: jest.fn().mockResolvedValue([ticket]),
    });
    const useCase = new SweepTicketSlaUseCase(
      ticketRepo,
      buildFakeNotifications(),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, breached: 0, warned: 0, errors: 0 });
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });
});
