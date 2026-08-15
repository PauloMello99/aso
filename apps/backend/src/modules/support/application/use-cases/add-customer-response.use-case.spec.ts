import { AddCustomerResponseUseCase } from "./add-customer-response.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { ITicketResponseRepository } from "../../domain/ticket-response.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketNotReopenableException } from "../../domain/exceptions/ticket-not-reopenable.exception";

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
    findByIdInOrg: jest.fn().mockResolvedValue(buildTicket()),
    findByIdAsAdmin: jest.fn(),
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
  orgId: "org-1",
  ticketId: "ticket-1",
  userId: "user-1",
  body: "Resposta do cliente",
};

describe("AddCustomerResponseUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest.fn().mockResolvedValue(null),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(ticketResponseRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketNotReopenableException quando o ticket está resolved", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "resolved" })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotReopenableException,
    );
    expect(ticketResponseRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("lança TicketNotReopenableException quando o ticket está closed", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "closed" })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotReopenableException,
    );
    expect(ticketResponseRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("transiciona waiting_customer para in_progress ao receber resposta do cliente", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "waiting_customer" })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await useCase.execute(baseInput);

    expect(ticketResponseRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ authorType: "customer" }),
    );
    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.status).toBe("in_progress");
  });

  it("não muda o status quando o ticket já está open", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "open" })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await useCase.execute(baseInput);

    expect(ticketResponseRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });

  it("não muda o status quando o ticket já está in_progress", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdInOrg: jest
        .fn()
        .mockResolvedValue(buildTicket({ status: "in_progress" })),
    });
    const ticketResponseRepo = buildFakeTicketResponseRepo();
    const useCase = new AddCustomerResponseUseCase(
      ticketRepo,
      ticketResponseRepo,
    );

    await useCase.execute(baseInput);

    expect(ticketResponseRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(ticketRepo.updateAsAdmin).not.toHaveBeenCalled();
  });
});
