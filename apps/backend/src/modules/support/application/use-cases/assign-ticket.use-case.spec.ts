import { AssignTicketUseCase } from "./assign-ticket.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";

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
    updateAsAdmin: jest.fn((ticket: TicketEntity) =>
      Promise.resolve(ticket),
    ),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

describe("AssignTicketUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AssignTicketUseCase(ticketRepo);

    await expect(
      useCase.execute({ ticketId: "ticket-1", agentUserId: "agent-1" }),
    ).rejects.toBeInstanceOf(TicketNotFoundException);
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("move para in_progress e atribui o agente quando o ticket está open", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest.fn().mockResolvedValue(buildTicket({ status: "open" })),
    });
    const useCase = new AssignTicketUseCase(ticketRepo);

    const result = await useCase.execute({
      ticketId: "ticket-1",
      agentUserId: "agent-1",
    });

    expect(result.status).toBe("in_progress");
    expect(result.assignedAgentId).toBe("agent-1");
    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
  });

  it("mantém o status atual e só atribui o agente quando o ticket não está open", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "waiting_customer" })),
    });
    const useCase = new AssignTicketUseCase(ticketRepo);

    const result = await useCase.execute({
      ticketId: "ticket-1",
      agentUserId: "agent-1",
    });

    expect(result.status).toBe("waiting_customer");
    expect(result.assignedAgentId).toBe("agent-1");
  });
});
