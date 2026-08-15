import { HandleInboundEmailUseCase } from "./handle-inbound-email.use-case";
import { ITicketRepository } from "../../domain/ticket.repository.interface";
import { ITicketResponseRepository } from "../../domain/ticket-response.repository.interface";
import {
  ITicketCategoryRepository,
  TicketCategory,
} from "../../domain/ticket-category.repository.interface";
import { ITicketAttachmentRepository } from "../../domain/ticket-attachment.repository.interface";
import { IInboundEmailRepository } from "../../domain/inbound-email.repository.interface";
import {
  IInboundEmailClient,
  InboundEmailAttachmentRef,
  InboundEmailBody,
} from "../../domain/ports/inbound-email.port";
import {
  ITransactionRunner,
  TransactionContext,
} from "../../domain/ports/transaction-runner.port";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { SupportNotificationService } from "../support-notification.service";

const TICKET_ID = "11111111-1111-1111-1111-111111111111";

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  return TicketEntity.fromProps({
    id: TICKET_ID,
    orgId: "org-1",
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
    slaFirstResponseDueAt: new Date("2026-01-01T08:00:00Z"),
    slaResolutionDueAt: new Date("2026-01-03T00:00:00Z"),
    slaFirstResponseBreachedAt: null,
    slaResolutionBreachedAt: null,
    slaWarningNotifiedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildCategory(
  overrides: Partial<TicketCategory> = {},
): TicketCategory {
  return {
    id: "category-1",
    systemKey: "other",
    label: "Outros",
    slaFirstResponseMinutes: 480,
    slaResolutionMinutes: 2880,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildEmailBody(
  overrides: Partial<InboundEmailBody> = {},
): InboundEmailBody {
  return {
    text: "Preciso de ajuda com o sistema.",
    html: null,
    from: "Cliente Teste <cliente@example.com>",
    to: [`suporte+${TICKET_ID}@assessorink-so.com`],
    subject: "Dúvida",
    ...overrides,
  };
}

function buildFakeEmailClient(
  overrides: Partial<jest.Mocked<IInboundEmailClient>> = {},
): jest.Mocked<IInboundEmailClient> {
  return {
    verifyWebhook: jest.fn(),
    getReceivedEmail: jest.fn().mockResolvedValue(buildEmailBody()),
    listAttachments: jest.fn().mockResolvedValue([]),
    downloadAttachment: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IInboundEmailClient>;
}

function buildFakeInboundEmailRepo(
  overrides: Partial<jest.Mocked<IInboundEmailRepository>> = {},
): jest.Mocked<IInboundEmailRepository> {
  return {
    claim: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IInboundEmailRepository>;
}

function buildFakeTransactionRunner(): jest.Mocked<ITransactionRunner> {
  return {
    run: jest.fn((fn: (tx: TransactionContext) => Promise<unknown>) =>
      fn({} as TransactionContext),
    ),
  } as unknown as jest.Mocked<ITransactionRunner>;
}

function buildFakeTicketRepo(
  overrides: Partial<jest.Mocked<ITicketRepository>> = {},
): jest.Mocked<ITicketRepository> {
  return {
    createAsAdmin: jest.fn((ticket: TicketEntity) => Promise.resolve(ticket)),
    findByIdInOrg: jest.fn(),
    findByIdAsAdmin: jest.fn().mockResolvedValue(buildTicket()),
    listByOrg: jest.fn(),
    updateAsAdmin: jest.fn((ticket: TicketEntity) => Promise.resolve(ticket)),
    listSlaCandidates: jest.fn(),
    listAllForAdminQueue: jest.fn(),
    findOrgById: jest.fn(),
    linkToOrganization: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeResponseRepo(
  overrides: Partial<jest.Mocked<ITicketResponseRepository>> = {},
): jest.Mocked<ITicketResponseRepository> {
  return {
    createAsAdmin: jest.fn((response: TicketResponseEntity) =>
      Promise.resolve(response),
    ),
    listByTicketInOrg: jest.fn(),
    listByTicketAsAdmin: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketResponseRepository>;
}

function buildFakeCategoryRepo(
  overrides: Partial<jest.Mocked<ITicketCategoryRepository>> = {},
): jest.Mocked<ITicketCategoryRepository> {
  return {
    listEnabled: jest.fn().mockResolvedValue([buildCategory()]),
    findById: jest.fn().mockResolvedValue(buildCategory()),
    ...overrides,
  } as unknown as jest.Mocked<ITicketCategoryRepository>;
}

function buildFakeAttachmentRepo(
  overrides: Partial<jest.Mocked<ITicketAttachmentRepository>> = {},
): jest.Mocked<ITicketAttachmentRepository> {
  return {
    createAsAdmin: jest.fn((data) =>
      Promise.resolve({
        id: "attachment-1",
        ticketId: data.ticketId,
        responseId: data.responseId,
        orgId: data.orgId,
        storagePath: data.storagePath,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedBy: data.uploadedBy,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ),
    listByTicketInOrg: jest.fn(),
    listByTicketAsAdmin: jest.fn(),
    findByIdInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITicketAttachmentRepository>;
}

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue("mocked-path"),
    createSignedUrl: jest.fn(),
    createSignedFileUrls: jest.fn(),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
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

function buildAttachmentRef(
  overrides: Partial<InboundEmailAttachmentRef> = {},
): InboundEmailAttachmentRef {
  return {
    id: "att-remote-1",
    fileName: "foto.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    downloadUrl: "https://example.com/download/att-remote-1",
    ...overrides,
  };
}

function buildUseCase(overrides?: {
  emailClient?: Partial<jest.Mocked<IInboundEmailClient>>;
  inboundEmailRepo?: Partial<jest.Mocked<IInboundEmailRepository>>;
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  responseRepo?: Partial<jest.Mocked<ITicketResponseRepository>>;
  categoryRepo?: Partial<jest.Mocked<ITicketCategoryRepository>>;
  attachmentRepo?: Partial<jest.Mocked<ITicketAttachmentRepository>>;
  storage?: Partial<jest.Mocked<IStorageProvider>>;
}) {
  const emailClient = buildFakeEmailClient(overrides?.emailClient);
  const inboundEmailRepo = buildFakeInboundEmailRepo(
    overrides?.inboundEmailRepo,
  );
  const transactionRunner = buildFakeTransactionRunner();
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const responseRepo = buildFakeResponseRepo(overrides?.responseRepo);
  const categoryRepo = buildFakeCategoryRepo(overrides?.categoryRepo);
  const attachmentRepo = buildFakeAttachmentRepo(overrides?.attachmentRepo);
  const storage = buildFakeStorage(overrides?.storage);
  const notifications = buildFakeNotifications();

  const useCase = new HandleInboundEmailUseCase(
    emailClient,
    inboundEmailRepo,
    transactionRunner,
    ticketRepo,
    responseRepo,
    categoryRepo,
    attachmentRepo,
    storage,
    notifications,
  );

  return {
    useCase,
    emailClient,
    inboundEmailRepo,
    transactionRunner,
    ticketRepo,
    responseRepo,
    categoryRepo,
    attachmentRepo,
    storage,
    notifications,
  };
}

describe("HandleInboundEmailUseCase", () => {
  it("retry com o mesmo email_id (claim retorna false) não cria segundo ticket nem toca em mais nada", async () => {
    const { useCase, inboundEmailRepo, ticketRepo, responseRepo } =
      buildUseCase({
        inboundEmailRepo: { claim: jest.fn().mockResolvedValue(false) },
      });

    const result = await useCase.execute("email-1", "msg-1");

    expect(result).toEqual({
      claimed: false,
      ticketId: null,
      responseId: null,
      outcome: null,
    });
    expect(ticketRepo.findByIdAsAdmin).not.toHaveBeenCalled();
    expect(ticketRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(responseRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(inboundEmailRepo.markProcessed).not.toHaveBeenCalled();
  });

  it("remetente divergente do requesterEmail do ticket linkado vira ticket órfão novo (não injeta resposta)", async () => {
    const linked = buildTicket({ requesterEmail: "outro@example.com" });
    const { useCase, ticketRepo, responseRepo, notifications } = buildUseCase({
      emailClient: {
        getReceivedEmail: jest.fn().mockResolvedValue(
          buildEmailBody({ from: "Cliente Teste <cliente@example.com>" }),
        ),
      },
      ticketRepo: {
        findByIdAsAdmin: jest.fn().mockResolvedValue(linked),
      },
    });

    await useCase.execute("email-2", null);

    expect(responseRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(ticketRepo.createAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: null,
        createdBy: null,
        requesterEmail: "cliente@example.com",
      }),
      expect.anything(),
    );
    expect(notifications.notifyTicketCreated).toHaveBeenCalledTimes(1);
  });

  it("e-mail para ticket 'closed' reabre o ticket automaticamente e adiciona resposta", async () => {
    const closedTicket = buildTicket({
      status: "closed",
      closedAt: new Date("2026-01-05T00:00:00Z"),
    });
    const { useCase, ticketRepo, responseRepo, notifications } = buildUseCase({
      ticketRepo: {
        findByIdAsAdmin: jest.fn().mockResolvedValue(closedTicket),
      },
    });

    const result = await useCase.execute("email-3", null);

    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.status).toBe("open");
    expect(responseRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(notifications.notifyReopened).toHaveBeenCalledTimes(1);
    expect(result.outcome).toContain("ticket_reopened");
  });

  it("corpo de 20k chars é truncado sem lançar", async () => {
    const longBody = "a".repeat(20_000);
    const { useCase, ticketRepo } = buildUseCase({
      emailClient: {
        getReceivedEmail: jest
          .fn()
          .mockResolvedValue(buildEmailBody({ text: longBody, to: [] })),
      },
    });

    await expect(useCase.execute("email-4", null)).resolves.toBeDefined();

    const created = ticketRepo.createAsAdmin.mock.calls[0][0] as TicketEntity;
    // Comprimento exato (não só <=5000) — distingue truncamento correto de
    // "caiu no fallback" ou de um off-by-suffix-length.
    expect(created.description).toHaveLength(5000);
    expect(created.description.endsWith("(mensagem truncada)")).toBe(true);
  });

  it("resposta a ticket 'waiting_customer' transiciona para 'in_progress'", async () => {
    const waitingTicket = buildTicket({ status: "waiting_customer" });
    const { useCase, ticketRepo, responseRepo } = buildUseCase({
      ticketRepo: {
        findByIdAsAdmin: jest.fn().mockResolvedValue(waitingTicket),
      },
    });

    await useCase.execute("email-3b", null);

    expect(ticketRepo.updateAsAdmin).toHaveBeenCalledTimes(1);
    const updated = ticketRepo.updateAsAdmin.mock.calls[0][0] as TicketEntity;
    expect(updated.status).toBe("in_progress");
    expect(responseRepo.createAsAdmin).toHaveBeenCalledTimes(1);
  });

  it("e-mail sem plus-address vira ticket órfão", async () => {
    const { useCase, ticketRepo, responseRepo } = buildUseCase({
      emailClient: {
        getReceivedEmail: jest
          .fn()
          .mockResolvedValue(buildEmailBody({ to: ["contato@assessorink-so.com"] })),
      },
    });

    await useCase.execute("email-5", null);

    expect(ticketRepo.findByIdAsAdmin).not.toHaveBeenCalled();
    expect(ticketRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(responseRepo.createAsAdmin).not.toHaveBeenCalled();
  });

  it("anexo válido gera 1 upload e 1 createAsAdmin", async () => {
    const { useCase, storage, attachmentRepo } = buildUseCase({
      emailClient: {
        listAttachments: jest.fn().mockResolvedValue([buildAttachmentRef()]),
        downloadAttachment: jest
          .fn()
          .mockResolvedValue(Buffer.from("fake-image-bytes")),
      },
    });

    const result = await useCase.execute("email-6", null);

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(attachmentRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(result.outcome).toContain("att=1/1");
  });

  it("anexo de 20MB é descartado sem lançar e sem chamar upload", async () => {
    const { useCase, storage, attachmentRepo, emailClient } = buildUseCase({
      emailClient: {
        listAttachments: jest
          .fn()
          .mockResolvedValue([
            buildAttachmentRef({ sizeBytes: 20 * 1024 * 1024 }),
          ]),
      },
    });

    const result = await useCase.execute("email-7", null);

    expect(emailClient.downloadAttachment).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(attachmentRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(result.outcome).toContain("att=0/1");
  });

  it("anexo com mimetype não permitido é descartado sem lançar e sem chamar upload", async () => {
    const { useCase, storage, attachmentRepo, emailClient } = buildUseCase({
      emailClient: {
        listAttachments: jest
          .fn()
          .mockResolvedValue([
            buildAttachmentRef({ mimeType: "application/zip" }),
          ]),
      },
    });

    const result = await useCase.execute("email-8", null);

    expect(emailClient.downloadAttachment).not.toHaveBeenCalled();
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(attachmentRepo.createAsAdmin).not.toHaveBeenCalled();
    expect(result.outcome).toContain("att=0/1");
  });

  it("falha de banco no createAsAdmin de um anexo (Fase 2, dentro da transação) propaga e reverte a transação inteira", async () => {
    const dbError = new Error("connection reset by peer");
    const {
      useCase,
      inboundEmailRepo,
      storage,
      attachmentRepo,
      emailClient,
      notifications,
    } = buildUseCase({
      emailClient: {
        getReceivedEmail: jest
          .fn()
          .mockResolvedValue(buildEmailBody({ to: [] })),
        listAttachments: jest.fn().mockResolvedValue([buildAttachmentRef()]),
        downloadAttachment: jest
          .fn()
          .mockResolvedValue(Buffer.from("fake-image-bytes")),
      },
      attachmentRepo: {
        createAsAdmin: jest.fn().mockRejectedValue(dbError),
      },
    });

    await expect(useCase.execute("email-9", null)).rejects.toThrow(
      "connection reset by peer",
    );

    // Anexo foi baixado (Fase 1, fora da transação) e o upload de storage
    // chegou a rodar (Fase 2), mas a falha no createAsAdmin propagou sem
    // ser engolida por try/catch. O ticket órfão foi criado dentro do mesmo
    // callback de transação, mas nada posterior ao ponto da falha (nem o
    // commit/markProcessed nem efeitos best-effort pós-commit) deve rodar —
    // sinal de que a transação inteira (claim + ticket + tudo) foi abortada.
    expect(emailClient.downloadAttachment).toHaveBeenCalledTimes(1);
    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(attachmentRepo.createAsAdmin).toHaveBeenCalledTimes(1);
    expect(inboundEmailRepo.markProcessed).not.toHaveBeenCalled();
    expect(notifications.notifyTicketCreated).not.toHaveBeenCalled();
  });
});
