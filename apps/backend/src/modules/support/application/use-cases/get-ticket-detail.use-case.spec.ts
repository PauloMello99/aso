import {
  GetTicketDetailUseCase,
  GetTicketDetailInput,
} from "./get-ticket-detail.use-case";
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
    findByIdInOrg: jest.fn().mockResolvedValue(buildTicket()),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn(),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeTicketResponseRepo(
  overrides: Partial<jest.Mocked<ITicketResponseRepository>> = {},
): jest.Mocked<ITicketResponseRepository> {
  return {
    createAsAdmin: jest.fn(),
    listByTicketInOrg: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<ITicketResponseRepository>;
}

function buildFakeAttachmentRepo(
  overrides: Partial<jest.Mocked<ITicketAttachmentRepository>> = {},
): jest.Mocked<ITicketAttachmentRepository> {
  return {
    createAsAdmin: jest.fn(),
    listByTicketInOrg: jest.fn().mockResolvedValue([]),
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
  const useCase = new GetTicketDetailUseCase(
    ticketRepo,
    ticketResponseRepo,
    ticketAttachmentRepo,
  );
  return { useCase, ticketRepo, ticketResponseRepo, ticketAttachmentRepo };
}

const baseInput: GetTicketDetailInput = {
  orgId: "org-1",
  ticketId: "ticket-1",
};

describe("GetTicketDetailUseCase", () => {
  it("lança TicketNotFoundException quando o ticket não existe na org", async () => {
    const { useCase, ticketResponseRepo, ticketAttachmentRepo } =
      buildUseCase({
        ticketRepo: { findByIdInOrg: jest.fn().mockResolvedValue(null) },
      });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      TicketNotFoundException,
    );
    expect(ticketResponseRepo.listByTicketInOrg).not.toHaveBeenCalled();
    expect(ticketAttachmentRepo.listByTicketInOrg).not.toHaveBeenCalled();
  });

  it("busca respostas (sem notas internas) e anexos do ticket", async () => {
    const ticket = buildTicket();
    const response = TicketResponseEntity.create({
      id: "response-1",
      ticketId: "ticket-1",
      orgId: "org-1",
      authorType: "customer",
      authorUserId: "user-1",
      body: "Mensagem do cliente.",
      isInternalNote: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const attachment = buildAttachment();

    const { useCase, ticketResponseRepo, ticketAttachmentRepo } =
      buildUseCase({
        ticketRepo: { findByIdInOrg: jest.fn().mockResolvedValue(ticket) },
        ticketResponseRepo: {
          listByTicketInOrg: jest.fn().mockResolvedValue([response]),
        },
        ticketAttachmentRepo: {
          listByTicketInOrg: jest.fn().mockResolvedValue([attachment]),
        },
      });

    const result = await useCase.execute(baseInput);

    expect(ticketResponseRepo.listByTicketInOrg).toHaveBeenCalledWith(
      "ticket-1",
      "org-1",
      false,
    );
    expect(ticketAttachmentRepo.listByTicketInOrg).toHaveBeenCalledWith(
      "ticket-1",
      "org-1",
    );
    expect(result).toEqual({
      ticket,
      responses: [response],
      attachments: [attachment],
    });
  });
});
