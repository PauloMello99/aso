import { AuditService } from "../../../audit/audit.service";
import type { CampaignDeliveryEvent } from "../../domain/campaign-delivery-webhook.port";
import type {
  ICampaignSendRepository,
  SentCampaignSend,
} from "../../domain/campaign-send.repository.interface";
import { HandleCampaignBounceUseCase } from "./handle-campaign-bounce.use-case";

const SENT_ROW_ID = "550e8400-e29b-41d4-a716-446655440001";

function buildFakeSent(
  overrides: Partial<SentCampaignSend> = {},
): SentCampaignSend {
  return {
    orgId: "org-1",
    customerId: "customer-1",
    trigger: "post_service",
    dedupeKey: "post_service:customer-1:2026-01-01",
    attempt: 1,
    sentAt: new Date("2026-01-01T12:00:00.000Z"),
    ...overrides,
  };
}

function buildEvent(
  overrides: Partial<CampaignDeliveryEvent> = {},
): CampaignDeliveryEvent {
  return {
    type: "email.bounced",
    emailId: "email_abc",
    tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
    bounceType: "Permanent",
    bounceSubType: "General",
    bounceMessage: "The recipient's email address is invalid.",
    ...overrides,
  };
}

function buildSendRepo(
  overrides: Partial<jest.Mocked<ICampaignSendRepository>> = {},
): jest.Mocked<ICampaignSendRepository> {
  return {
    record: jest.fn(),
    findRetriable: jest.fn().mockResolvedValue([]),
    recordBounce: jest.fn().mockResolvedValue(true),
    findSentById: jest.fn().mockResolvedValue(buildFakeSent()),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignSendRepository>;
}

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

describe("HandleCampaignBounceUseCase", () => {
  it("tag campaign_send_id ausente: não escreve nada, retorna handled:false/no_tag", async () => {
    const sendRepo = buildSendRepo();
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    const result = await useCase.execute(buildEvent({ tags: {} }));

    expect(result).toEqual({ handled: false, reason: "no_tag" });
    expect(sendRepo.findSentById).not.toHaveBeenCalled();
    expect(sendRepo.recordBounce).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("tag campaign_send_id vazia: tratada como ausente", async () => {
    const sendRepo = buildSendRepo();
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    const result = await useCase.execute(
      buildEvent({ tags: { campaign_send_id: "" } }),
    );

    expect(result).toEqual({ handled: false, reason: "no_tag" });
    expect(sendRepo.recordBounce).not.toHaveBeenCalled();
  });

  it("tag campaign_send_id não-UUID: não consulta o repositório, retorna handled:false/not_found (F1)", async () => {
    const sendRepo = buildSendRepo();
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    const result = await useCase.execute(
      buildEvent({ tags: { campaign_send_id: "not-a-uuid'; --" } }),
    );

    expect(result).toEqual({ handled: false, reason: "not_found" });
    expect(sendRepo.findSentById).not.toHaveBeenCalled();
    expect(sendRepo.recordBounce).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("linha sent não encontrada: não escreve nada, retorna handled:false/not_found", async () => {
    const sendRepo = buildSendRepo({
      findSentById: jest.fn().mockResolvedValue(null),
    });
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    const result = await useCase.execute(buildEvent());

    expect(result).toEqual({ handled: false, reason: "not_found" });
    expect(sendRepo.recordBounce).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("caminho feliz: grava recordBounce e audit log com os campos certos, sem e-mail em claro", async () => {
    const sent = buildFakeSent({
      orgId: "org-9",
      customerId: "customer-9",
      trigger: "birthday",
      dedupeKey: "birthday:customer-9:2026",
      attempt: 2,
      sentAt: new Date("2026-02-01T08:00:00.000Z"),
    });
    const sendRepo = buildSendRepo({
      findSentById: jest.fn().mockResolvedValue(sent),
    });
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);
    const event = buildEvent({
      tags: { campaign_send_id: SENT_ROW_ID },
      bounceMessage: "cliente@example.com is not a valid recipient",
    });

    const result = await useCase.execute(event);

    expect(result).toEqual({ handled: true });
    expect(sendRepo.recordBounce).toHaveBeenCalledWith({
      sentRowId: SENT_ROW_ID,
      orgId: "org-9",
      customerId: "customer-9",
      trigger: "birthday",
      dedupeKey: "birthday:customer-9:2026",
      attempt: 2,
      sentAt: sent.sentAt,
      reason: "Permanent/General: [email redigido] is not a valid recipient",
    });

    expect(auditService.log).toHaveBeenCalledTimes(1);
    const [entry] = auditService.log.mock.calls[0]!;
    expect(entry.actorId).toBeNull();
    expect(entry.orgId).toBe("org-9");
    expect(entry.action).toBe("campaign_email_bounced");
    expect(entry.entityType).toBe("campaign_send");
    expect(entry.entityId).toBe(SENT_ROW_ID);
    const serializedMetadata = JSON.stringify(entry.metadata);
    expect(serializedMetadata).not.toContain("cliente@example.com");
    expect(entry.metadata).toEqual({
      trigger: "birthday",
      attempt: 2,
      bounceType: "Permanent",
      bounceSubType: "General",
    });
  });

  it("reason persistido é redigido (não contém o e-mail cru do bounceMessage)", async () => {
    const sendRepo = buildSendRepo();
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    await useCase.execute(
      buildEvent({
        bounceMessage: "Delivery to atacante@evil.com failed permanently",
      }),
    );

    const [input] = sendRepo.recordBounce.mock.calls[0]!;
    expect(input.reason).not.toContain("atacante@evil.com");
    expect(input.reason).toContain("[email redigido]");
  });

  it("reentrega do mesmo evento: recordBounce devolve false, sem novo audit log, handled:true", async () => {
    const sendRepo = buildSendRepo();
    sendRepo.recordBounce.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);
    const event = buildEvent();

    const first = await useCase.execute(event);
    const second = await useCase.execute(event);

    expect(first).toEqual({ handled: true });
    expect(second).toEqual({ handled: true });
    expect(sendRepo.recordBounce).toHaveBeenCalledTimes(2);
    expect(sendRepo.recordBounce.mock.calls[0]).toEqual(
      sendRepo.recordBounce.mock.calls[1],
    );
    expect(auditService.log).toHaveBeenCalledTimes(1);
  });

  it("recordBounce false (já registrado): não chama auditService.log", async () => {
    const sendRepo = buildSendRepo({
      recordBounce: jest.fn().mockResolvedValue(false),
    });
    const auditService = buildFakeAuditService();
    const useCase = new HandleCampaignBounceUseCase(sendRepo, auditService);

    const result = await useCase.execute(buildEvent());

    expect(result).toEqual({ handled: true });
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
