import { LinkTicketToOrganizationUseCase } from "./link-ticket-to-organization.use-case";
import {
  ITicketRepository,
  TicketOrgSummary,
} from "../../domain/ticket.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketNotFoundException } from "../../domain/exceptions/ticket-not-found.exception";
import { TicketAlreadyLinkedException } from "../../domain/exceptions/ticket-already-linked.exception";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";

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

function buildOrgSummary(
  overrides: Partial<TicketOrgSummary> = {},
): TicketOrgSummary {
  return {
    id: "org-1",
    name: "Org Teste",
    slug: "org-teste",
    ...overrides,
  };
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
    findOrgById: jest.fn().mockResolvedValue(buildOrgSummary()),
    linkToOrganization: jest
      .fn()
      .mockImplementation((ticketId: string, orgId: string) =>
        Promise.resolve(buildTicket({ id: ticketId, orgId })),
      ),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

describe("LinkTicketToOrganizationUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest.fn().mockResolvedValue(null),
    });
    const useCase = new LinkTicketToOrganizationUseCase(ticketRepo);

    await expect(
      useCase.execute({ ticketId: "ticket-1", orgId: "org-1" }),
    ).rejects.toBeInstanceOf(TicketNotFoundException);
    expect(ticketRepo.linkToOrganization).not.toHaveBeenCalled();
  });

  it("lança TicketAlreadyLinkedException (409) quando o ticket já tem org, sem chamar linkToOrganization", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findByIdAsAdmin: jest
        .fn()
        .mockResolvedValue(buildTicket({ orgId: "org-already" })),
    });
    const useCase = new LinkTicketToOrganizationUseCase(ticketRepo);

    await expect(
      useCase.execute({ ticketId: "ticket-1", orgId: "org-1" }),
    ).rejects.toBeInstanceOf(TicketAlreadyLinkedException);
    expect(ticketRepo.linkToOrganization).not.toHaveBeenCalled();
    expect(ticketRepo.findOrgById).not.toHaveBeenCalled();
  });

  it("lança OrgNotFoundException quando a organização não existe", async () => {
    const ticketRepo = buildFakeTicketRepo({
      findOrgById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new LinkTicketToOrganizationUseCase(ticketRepo);

    await expect(
      useCase.execute({ ticketId: "ticket-1", orgId: "org-inexistente" }),
    ).rejects.toBeInstanceOf(OrgNotFoundException);
    expect(ticketRepo.linkToOrganization).not.toHaveBeenCalled();
  });

  it("vincula o ticket órfão à organização quando tudo é válido", async () => {
    const ticketRepo = buildFakeTicketRepo();
    const useCase = new LinkTicketToOrganizationUseCase(ticketRepo);

    const result = await useCase.execute({
      ticketId: "ticket-1",
      orgId: "org-1",
    });

    expect(ticketRepo.linkToOrganization).toHaveBeenCalledWith(
      "ticket-1",
      "org-1",
    );
    expect(result.orgId).toBe("org-1");
  });
});
