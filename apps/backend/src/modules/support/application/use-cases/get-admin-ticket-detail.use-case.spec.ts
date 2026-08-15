import {
  GetAdminTicketDetailUseCase,
  GetAdminTicketDetailInput,
} from "./get-admin-ticket-detail.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { ITicketResponseRepository } from "../../domain/ticket-response.repository.interface";
import {
  ITicketAttachmentRepository,
  TicketAttachmentRecord,
} from "../../domain/ticket-attachment.repository.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
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

function buildAttachment(
  overrides: Partial<TicketAttachmentRecord> = {},
): TicketAttachmentRecord {
  return {
    id: "attachment-1",
    ticketId: "ticket-1",
    responseId: null,
    orgId: "org-1",
    storagePath: "org-1/ticket-1/foto.png",
    fileName: "foto.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    uploadedBy: "user-1",
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
    findByIdAsAdmin: jest.fn().mockResolvedValue(buildTicket()),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn(),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    findOrgById: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeTicketResponseRepo(
  overrides: Partial<jest.Mocked<ITicketResponseRepository>> = {},
): jest.Mocked<ITicketResponseRepository> {
  return {
    createAsAdmin: jest.fn(),
    listByTicketInOrg: jest.fn(),
    listByTicketAsAdmin: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ITicketResponseRepository>;
}

function buildFakeAttachmentRepo(
  overrides: Partial<jest.Mocked<ITicketAttachmentRepository>> = {},
): jest.Mocked<ITicketAttachmentRepository> {
  return {
    createAsAdmin: jest.fn(),
    listByTicketInOrg: jest.fn(),
    listByTicketAsAdmin: jest.fn().mockResolvedValue([]),
    findByIdInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketAttachmentRepository>;
}

function buildUseCase(overrides?: {
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  ticketResponseRepo?: Partial<jest.Mocked<ITicketResponseRepository>>;
  ticketAttachmentRepo?: Partial<jest.Mocked<ITicketAttachmentRepository>>;
}) {
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const ticketResponseRepo = buildFakeTicketResponseRepo(
    overrides?.ticketResponseRepo,
  );
  const ticketAttachmentRepo = buildFakeAttachmentRepo(
    overrides?.ticketAttachmentRepo,
  );
  const useCase = new GetAdminTicketDetailUseCase(
    ticketRepo,
    ticketResponseRepo,
    ticketAttachmentRepo,
  );
  return { useCase, ticketRepo, ticketResponseRepo, ticketAttachmentRepo };
}

const baseInput: GetAdminTicketDetailInput = {
  ticketId: "ticket-1",
};

describe("GetAdminTicketDetailUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe", async () => {
    const { useCase, ticketResponseRepo, ticketAttachmentRepo } =
      buildUseCase({
        ticketRepo: { findByIdAsAdmin: jest.fn().mockResolvedValue(null) },
      });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(ticketResponseRepo.listByTicketAsAdmin).not.toHaveBeenCalled();
    expect(ticketAttachmentRepo.listByTicketAsAdmin).not.toHaveBeenCalled();
  });

  it("busca respostas (incluindo notas internas) e anexos do ticket", async () => {
    const ticket = buildTicket();
    const internalNote = TicketResponseEntity.create({
      id: "response-1",
      ticketId: "ticket-1",
      orgId: "org-1",
      authorType: "agent",
      authorUserId: "agent-1",
      body: "Nota interna sobre o chamado.",
      isInternalNote: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const attachment = buildAttachment();

    const { useCase, ticketResponseRepo, ticketAttachmentRepo } =
      buildUseCase({
        ticketRepo: { findByIdAsAdmin: jest.fn().mockResolvedValue(ticket) },
        ticketResponseRepo: {
          listByTicketAsAdmin: jest.fn().mockResolvedValue([internalNote]),
        },
        ticketAttachmentRepo: {
          listByTicketAsAdmin: jest.fn().mockResolvedValue([attachment]),
        },
      });

    const result = await useCase.execute(baseInput);

    expect(ticketResponseRepo.listByTicketAsAdmin).toHaveBeenCalledWith(
      "ticket-1",
      true,
    );
    expect(ticketAttachmentRepo.listByTicketAsAdmin).toHaveBeenCalledWith(
      "ticket-1",
    );
    expect(result).toEqual({
      ticket,
      responses: [internalNote],
      attachments: [attachment],
    });
    expect(result.responses[0]?.isInternalNote).toBe(true);
  });
});
