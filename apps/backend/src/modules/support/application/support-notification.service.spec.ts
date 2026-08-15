import { ConfigService } from "@nestjs/config";
import { SupportNotificationService } from "./support-notification.service";
import { ITicketRepository } from "../domain/ticket.repository.interface";
import { IUserRepository } from "../../user/domain/user.repository.interface";
import { MailService } from "../../mail/application/mail.service";
import { TicketEntity } from "../domain/ticket.entity";
import { TicketResponseEntity } from "../domain/ticket-response.entity";

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

function buildResponse(
  overrides: Partial<TicketResponseEntity> = {},
): TicketResponseEntity {
  return TicketResponseEntity.create({
    id: "response-1",
    ticketId: "ticket-1",
    orgId: "org-1",
    authorType: "agent",
    authorUserId: "agent-1",
    body: "Resposta do agente",
    isInternalNote: false,
    createdAt: new Date("2026-01-01T00:30:00Z"),
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
    findOrgById: jest
      .fn()
      .mockResolvedValue({ id: "org-1", name: "Helena's Ink", slug: "helenas-ink" }),
    ...overrides,
  } as unknown as jest.Mocked<ITicketRepository>;
}

function buildFakeUserRepo(
  overrides: Partial<jest.Mocked<IUserRepository>> = {},
): jest.Mocked<IUserRepository> {
  return {
    findByAuthId: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPlatformAdminEmails: jest.fn().mockResolvedValue([
      { id: "admin-1", name: "Super Admin", email: "admin@example.com" },
    ]),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
}

function buildFakeMailService(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendTicketCreated: jest.fn().mockResolvedValue(true),
    sendTicketResponseAdded: jest.fn().mockResolvedValue(true),
    sendTicketStatusChanged: jest.fn().mockResolvedValue(true),
    sendTicketSlaAlert: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<MailService>;
}

function buildFakeConfig(
  env: Record<string, string | undefined> = {},
): jest.Mocked<ConfigService> {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === "FRONTEND_URL") return "http://localhost:3000";
      if (key in env) return env[key];
      return defaultValue;
    }),
  } as unknown as jest.Mocked<ConfigService>;
}

function buildService(overrides?: {
  ticketRepo?: Partial<jest.Mocked<ITicketRepository>>;
  userRepo?: Partial<jest.Mocked<IUserRepository>>;
  mail?: Partial<jest.Mocked<MailService>>;
  env?: Record<string, string | undefined>;
}) {
  const ticketRepo = buildFakeTicketRepo(overrides?.ticketRepo);
  const userRepo = buildFakeUserRepo(overrides?.userRepo);
  const mail = buildFakeMailService(overrides?.mail);
  const config = buildFakeConfig(overrides?.env);
  const service = new SupportNotificationService(
    ticketRepo,
    userRepo,
    mail,
    config,
  );
  return { service, ticketRepo, userRepo, mail, config };
}

describe("SupportNotificationService", () => {
  it("notifyTicketCreated nunca propaga exceção quando o envio de e-mail falha (ADR-0012)", async () => {
    const { service, mail } = buildService({
      mail: { sendTicketCreated: jest.fn().mockRejectedValue(new Error("boom")) },
    });

    await expect(
      service.notifyTicketCreated(buildTicket()),
    ).resolves.toBeUndefined();
    expect(mail.sendTicketCreated).toHaveBeenCalledTimes(1);
  });

  it("notifyTicketCreated não propaga exceção quando a org não é encontrada (portalUrl undefined)", async () => {
    const { service, mail } = buildService({
      ticketRepo: { findOrgById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.notifyTicketCreated(buildTicket()),
    ).resolves.toBeUndefined();
    expect(mail.sendTicketCreated).toHaveBeenCalledWith(
      expect.objectContaining({ portalUrl: undefined }),
    );
  });

  it("notifyAgentResponseAdded não envia e-mail quando a resposta é nota interna", async () => {
    const { service, mail } = buildService();

    await service.notifyAgentResponseAdded(
      buildTicket(),
      buildResponse({ isInternalNote: true }),
    );

    expect(mail.sendTicketResponseAdded).not.toHaveBeenCalled();
  });

  it("notifyAgentResponseAdded envia e-mail quando a resposta é pública", async () => {
    const { service, mail } = buildService();

    await service.notifyAgentResponseAdded(buildTicket(), buildResponse());

    expect(mail.sendTicketResponseAdded).toHaveBeenCalledTimes(1);
  });

  it("notifyStatusChanged não envia e-mail para status não notificável (in_progress)", async () => {
    const { service, mail } = buildService();

    await service.notifyStatusChanged(
      buildTicket({ status: "in_progress" }),
      "open",
    );

    expect(mail.sendTicketStatusChanged).not.toHaveBeenCalled();
  });

  it("notifyStatusChanged envia e-mail para status resolved", async () => {
    const { service, mail } = buildService();

    await service.notifyStatusChanged(
      buildTicket({ status: "resolved" }),
      "in_progress",
    );

    expect(mail.sendTicketStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: "Resolvido" }),
    );
  });

  it("notifySlaAlert não envia nada quando não há usuários de plataforma", async () => {
    const { service, mail } = buildService({
      userRepo: { findPlatformAdminEmails: jest.fn().mockResolvedValue([]) },
    });

    await service.notifySlaAlert(buildTicket(), "first_response_breached");

    expect(mail.sendTicketSlaAlert).not.toHaveBeenCalled();
  });

  it("notifySlaAlert nunca propaga exceção quando o envio falha (ADR-0012)", async () => {
    const { service, mail } = buildService({
      mail: {
        sendTicketSlaAlert: jest.fn().mockRejectedValue(new Error("boom")),
      },
    });

    await expect(
      service.notifySlaAlert(buildTicket(), "resolution_near"),
    ).resolves.toBeUndefined();
    expect(mail.sendTicketSlaAlert).toHaveBeenCalledTimes(1);
  });

  it("notifyTicketCreated não consulta a org e envia portalUrl undefined para ticket órfão (org_id NULL)", async () => {
    const { service, mail, ticketRepo } = buildService();

    await expect(
      service.notifyTicketCreated(buildTicket({ orgId: null })),
    ).resolves.toBeUndefined();
    expect(ticketRepo.findOrgById).not.toHaveBeenCalled();
    expect(mail.sendTicketCreated).toHaveBeenCalledWith(
      expect.objectContaining({ portalUrl: undefined }),
    );
  });

  it("notifySlaAlert não consulta a org e usa fallback de orgName para ticket órfão (org_id NULL)", async () => {
    const { service, mail, ticketRepo } = buildService();

    await service.notifySlaAlert(
      buildTicket({ orgId: null }),
      "first_response_breached",
    );

    expect(ticketRepo.findOrgById).not.toHaveBeenCalled();
    expect(mail.sendTicketSlaAlert).toHaveBeenCalledWith(
      expect.objectContaining({ orgName: "Sem organização" }),
    );
  });

  describe("Reply-To de threading (plus-addressing, e-mail-to-ticket)", () => {
    const env = {
      SUPPORT_INBOUND_DOMAIN: "assessorink-so.com",
      SUPPORT_INBOUND_LOCAL_PART: "suporte",
    };

    it("notifyTicketCreated inclui replyTo com SUPPORT_INBOUND_DOMAIN configurada", async () => {
      const { service, mail } = buildService({ env });

      await service.notifyTicketCreated(buildTicket({ id: "ticket-1" }));

      expect(mail.sendTicketCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: "suporte+ticket-1@assessorink-so.com",
        }),
      );
    });

    it("notifyAgentResponseAdded inclui replyTo com SUPPORT_INBOUND_DOMAIN configurada", async () => {
      const { service, mail } = buildService({ env });

      await service.notifyAgentResponseAdded(
        buildTicket({ id: "ticket-1" }),
        buildResponse(),
      );

      expect(mail.sendTicketResponseAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: "suporte+ticket-1@assessorink-so.com",
        }),
      );
    });

    it("notifyStatusChanged inclui replyTo com SUPPORT_INBOUND_DOMAIN configurada", async () => {
      const { service, mail } = buildService({ env });

      await service.notifyStatusChanged(
        buildTicket({ id: "ticket-1", status: "resolved" }),
        "in_progress",
      );

      expect(mail.sendTicketStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: "suporte+ticket-1@assessorink-so.com",
        }),
      );
    });

    it("sem SUPPORT_INBOUND_DOMAIN, os 3 disparos ao requester enviam replyTo undefined", async () => {
      const { service, mail } = buildService();

      await service.notifyTicketCreated(buildTicket({ id: "ticket-1" }));
      await service.notifyAgentResponseAdded(
        buildTicket({ id: "ticket-1" }),
        buildResponse(),
      );
      await service.notifyStatusChanged(
        buildTicket({ id: "ticket-1", status: "resolved" }),
        "in_progress",
      );

      expect(mail.sendTicketCreated).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: undefined }),
      );
      expect(mail.sendTicketResponseAdded).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: undefined }),
      );
      expect(mail.sendTicketStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: undefined }),
      );
    });

    it("notifySlaAlert nunca inclui replyTo (alerta interno, mesmo com SUPPORT_INBOUND_DOMAIN configurada)", async () => {
      const { service, mail } = buildService({ env });

      await service.notifySlaAlert(
        buildTicket({ id: "ticket-1" }),
        "first_response_breached",
      );

      expect(mail.sendTicketSlaAlert).toHaveBeenCalledTimes(1);
      const call = mail.sendTicketSlaAlert.mock.calls[0]?.[0];
      expect(call).not.toHaveProperty("replyTo");
    });
  });
});
