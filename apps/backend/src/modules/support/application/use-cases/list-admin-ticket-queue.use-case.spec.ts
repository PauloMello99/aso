import {
  ListAdminTicketQueueUseCase,
  ListAdminTicketQueueInput,
} from "./list-admin-ticket-queue.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  return TicketEntity.fromProps({
    id: "ticket-1",
    orgId: null,
    categoryId: "category-1",
    createdBy: null,
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

describe("ListAdminTicketQueueUseCase", () => {
  it("repassa orphanOnly ao repositório junto com os demais filtros (a exclusão mútua com orgId é responsabilidade do repositório)", async () => {
    const orphanTicket = buildTicket({ orgId: null });
    const ticketRepo = buildFakeTicketRepo({
      listAllForAdminQueue: jest.fn().mockResolvedValue({
        items: [orphanTicket],
        total: 1,
      }),
    });
    const useCase = new ListAdminTicketQueueUseCase(ticketRepo);

    const input: ListAdminTicketQueueInput = {
      orphanOnly: true,
      orgId: "org-1",
      page: 1,
      pageSize: 20,
    };
    const result = await useCase.execute(input);

    expect(ticketRepo.listAllForAdminQueue).toHaveBeenCalledWith({
      status: undefined,
      categoryId: undefined,
      orgId: "org-1",
      orphanOnly: true,
      page: 1,
      pageSize: 20,
    });
    expect(result.items).toEqual([orphanTicket]);
  });

  it("filtra por orgId normalmente quando orphanOnly está ausente", async () => {
    const orgTicket = buildTicket({ orgId: "org-1" });
    const ticketRepo = buildFakeTicketRepo({
      listAllForAdminQueue: jest.fn().mockResolvedValue({
        items: [orgTicket],
        total: 1,
      }),
    });
    const useCase = new ListAdminTicketQueueUseCase(ticketRepo);

    const input: ListAdminTicketQueueInput = {
      orgId: "org-1",
      page: 1,
      pageSize: 20,
    };
    await useCase.execute(input);

    expect(ticketRepo.listAllForAdminQueue).toHaveBeenCalledWith({
      status: undefined,
      categoryId: undefined,
      orgId: "org-1",
      orphanOnly: undefined,
      page: 1,
      pageSize: 20,
    });
  });
});
