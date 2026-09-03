import type { ConfigService } from "@nestjs/config";
import { AuditService } from "../../../audit/audit.service";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import type { Campaign } from "../../domain/campaign.entity";
import type { ICampaignRepository } from "../../domain/campaign.repository.interface";
import { CampaignInvalidBodyException } from "../../domain/exceptions/campaign-invalid-body.exception";
import { CampaignInvalidInactivityMonthsException } from "../../domain/exceptions/campaign-invalid-inactivity-months.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import { CampaignTriggerAlreadyUsedException } from "../../domain/exceptions/campaign-trigger-already-used.exception";
import {
  CreateCampaignInput,
  CreateCampaignUseCase,
} from "./create-campaign.use-case";

function buildFakeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    orgId: "org-1",
    trigger: "post_service",
    name: "Pós-atendimento",
    enabled: false,
    subject: null,
    body: null,
    inactivityMonths: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildRepo(
  overrides: Partial<jest.Mocked<ICampaignRepository>> = {},
): jest.Mocked<ICampaignRepository> {
  return {
    findAllByOrg: jest.fn().mockResolvedValue([]),
    findByIdAndOrg: jest.fn(),
    create: jest.fn().mockResolvedValue(buildFakeCampaign()),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignRepository>;
}

function buildOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeAuditService(): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
}

const SUPABASE_URL = "https://x.supabase.co";
const CAMPAIGN_IMAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/campaign-images/`;

function buildConfig(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const map: Record<string, string | undefined> = {
    SUPABASE_URL,
    ...overrides,
  };
  return {
    get: jest.fn((key: string, dflt?: string) => map[key] ?? dflt),
  } as unknown as ConfigService;
}

function buildInput(
  overrides: Partial<CreateCampaignInput> = {},
): CreateCampaignInput {
  return {
    orgId: "org-1",
    authId: "owner-1",
    trigger: "post_service",
    name: "Pós-atendimento",
    enabled: false,
    subject: null,
    body: null,
    inactivityMonths: null,
    ...overrides,
  };
}

describe("CreateCampaignUseCase", () => {
  it("owner cria a campanha e audita com operation 'created'", async () => {
    const created = buildFakeCampaign({ id: "campaign-9", enabled: true });
    const repo = buildRepo({ create: jest.fn().mockResolvedValue(created) });
    const auditService = buildFakeAuditService();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
      buildConfig(),
    );

    const result = await useCase.execute(
      buildInput({ name: "  Pós-atendimento  ", enabled: true }),
    );

    expect(result).toBe(created);
    expect(repo.create).toHaveBeenCalledWith({
      orgId: "org-1",
      trigger: "post_service",
      name: "Pós-atendimento",
      enabled: true,
      subject: null,
      body: null,
      inactivityMonths: null,
    });

    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    const [authId, entry] = auditService.logByAuthId.mock.calls[0]!;
    expect(authId).toBe("owner-1");
    expect(entry.action).toBe("campaign_settings_updated");
    expect(entry.entityType).toBe("campaign");
    expect(entry.entityId).toBe("campaign-9");
    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata.operation).toBe("created");
    expect(metadata.trigger).toBe("post_service");
    expect(metadata.campaignId).toBe("campaign-9");
    expect(metadata.changed).toEqual(
      expect.arrayContaining(["name", "enabled"]),
    );
  });

  it("não guarda subject/body no metadata do audit", async () => {
    const repo = buildRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
      buildConfig(),
    );

    await useCase.execute(
      buildInput({
        subject: "Assunto secreto {{customerName}}",
        body: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "corpo secreto" }] },
          ],
        },
      }),
    );

    const [, entry] = auditService.logByAuthId.mock.calls[0]!;
    const serialized = JSON.stringify(entry.metadata);
    expect(serialized).not.toContain("Assunto secreto");
    expect(serialized).not.toContain("corpo secreto");
    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata.changed).toEqual(
      expect.arrayContaining(["subject", "body"]),
    );
  });

  it("não-owner: lança CampaignSettingsForbiddenException, não cria e não audita", async () => {
    const repo = buildRepo();
    const auditService = buildFakeAuditService();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) }),
      auditService,
      buildConfig(),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CampaignSettingsForbiddenException,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("pré-check: gatilho já usado lança CampaignTriggerAlreadyUsedException", async () => {
    const repo = buildRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildFakeCampaign({ trigger: "birthday" })]),
    });
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(buildInput({ trigger: "birthday" })),
    ).rejects.toBeInstanceOf(CampaignTriggerAlreadyUsedException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("body fora da allowlist lança CampaignInvalidBodyException", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(
        buildInput({ body: { type: "doc", content: [{ type: "iframe" }] } }),
      ),
    ).rejects.toBeInstanceOf(CampaignInvalidBodyException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("body com image.src fora do bucket campaign-images lança CampaignInvalidBodyException", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(
        buildInput({
          body: {
            type: "doc",
            content: [
              { type: "image", attrs: { src: "https://evil.com/x.png" } },
            ],
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CampaignInvalidBodyException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("body com image.src no prefixo do bucket campaign-images é aceito", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(
      buildInput({
        body: {
          type: "doc",
          content: [
            {
              type: "image",
              attrs: { src: `${CAMPAIGN_IMAGE_PREFIX}org-1/a.png` },
            },
          ],
        },
      }),
    );

    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("trigger 'inactivity' sem inactivityMonths lança CampaignInvalidInactivityMonthsException", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(
        buildInput({ trigger: "inactivity", inactivityMonths: null }),
      ),
    ).rejects.toThrow(CampaignInvalidInactivityMonthsException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("trigger 'inactivity' clampa inactivityMonths para 1-36 e trunca", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(
      buildInput({ trigger: "inactivity", inactivityMonths: 99.7 }),
    );

    expect(repo.create.mock.calls[0]![0].inactivityMonths).toBe(36);
  });

  it("trigger não-inactivity força inactivityMonths para null", async () => {
    const repo = buildRepo();
    const useCase = new CreateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(
      buildInput({ trigger: "birthday", inactivityMonths: 6 }),
    );

    expect(repo.create.mock.calls[0]![0].inactivityMonths).toBeNull();
  });
});
