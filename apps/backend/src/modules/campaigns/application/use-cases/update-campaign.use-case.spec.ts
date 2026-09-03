import type { ConfigService } from "@nestjs/config";
import { AuditService } from "../../../audit/audit.service";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import type { Campaign } from "../../domain/campaign.entity";
import type { ICampaignRepository } from "../../domain/campaign.repository.interface";
import { CampaignInvalidBodyException } from "../../domain/exceptions/campaign-invalid-body.exception";
import { CampaignInvalidInactivityMonthsException } from "../../domain/exceptions/campaign-invalid-inactivity-months.exception";
import { CampaignNotFoundException } from "../../domain/exceptions/campaign-not-found.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import {
  UpdateCampaignInput,
  UpdateCampaignUseCase,
} from "./update-campaign.use-case";

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
    findAllByOrg: jest.fn(),
    findByIdAndOrg: jest.fn().mockResolvedValue(buildFakeCampaign()),
    create: jest.fn(),
    update: jest
      .fn()
      .mockImplementation((_id: string, _orgId: string, patch: Partial<Campaign>) =>
        Promise.resolve(buildFakeCampaign(patch)),
      ),
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

function buildConfig(): ConfigService {
  const map: Record<string, string | undefined> = { SUPABASE_URL };
  return {
    get: jest.fn((key: string, dflt?: string) => map[key] ?? dflt),
  } as unknown as ConfigService;
}

function buildInput(
  overrides: Partial<UpdateCampaignInput> = {},
): UpdateCampaignInput {
  return {
    orgId: "org-1",
    authId: "owner-1",
    id: "campaign-1",
    patch: {},
    ...overrides,
  };
}

describe("UpdateCampaignUseCase", () => {
  it("toggle: patch { enabled: true } muda só enabled e audita changed ['enabled']", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest
        .fn()
        .mockResolvedValue(buildFakeCampaign({ enabled: false })),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
      buildConfig(),
    );

    await useCase.execute(buildInput({ patch: { enabled: true } }));

    expect(repo.update).toHaveBeenCalledWith("campaign-1", "org-1", {
      enabled: true,
    });
    const [, entry] = auditService.logByAuthId.mock.calls[0]!;
    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata.operation).toBe("updated");
    expect(metadata.changed).toEqual(["enabled"]);
  });

  it("campanha inexistente lança CampaignNotFoundException e não audita", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest.fn().mockResolvedValue(null),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
      buildConfig(),
    );

    await expect(
      useCase.execute(buildInput({ patch: { enabled: true } })),
    ).rejects.toBeInstanceOf(CampaignNotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("update perde a corrida com um delete (repo.update devolve null) lança CampaignNotFoundException", async () => {
    const repo = buildRepo({
      update: jest.fn().mockResolvedValue(null),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
      buildConfig(),
    );

    await expect(
      useCase.execute(buildInput({ patch: { enabled: true } })),
    ).rejects.toBeInstanceOf(CampaignNotFoundException);
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("não-owner lança CampaignSettingsForbiddenException", async () => {
    const repo = buildRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) }),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(buildInput({ patch: { enabled: true } })),
    ).rejects.toBeInstanceOf(CampaignSettingsForbiddenException);
    expect(repo.findByIdAndOrg).not.toHaveBeenCalled();
  });

  it("body fora da allowlist lança CampaignInvalidBodyException", async () => {
    const repo = buildRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(
        buildInput({
          patch: { body: { type: "doc", content: [{ type: "iframe" }] } },
        }),
      ),
    ).rejects.toBeInstanceOf(CampaignInvalidBodyException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("patch.body com image.src fora do bucket campaign-images lança CampaignInvalidBodyException", async () => {
    const repo = buildRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(
        buildInput({
          patch: {
            body: {
              type: "doc",
              content: [
                { type: "image", attrs: { src: "https://evil.com/x.png" } },
              ],
            },
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CampaignInvalidBodyException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("patch.body com image.src no prefixo do bucket campaign-images é aceito", async () => {
    const repo = buildRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(
      buildInput({
        patch: {
          body: {
            type: "doc",
            content: [
              {
                type: "image",
                attrs: { src: `${CAMPAIGN_IMAGE_PREFIX}org-1/a.png` },
              },
            ],
          },
        },
      }),
    );

    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it("normaliza name (trim) e subject vazio -> null nos campos presentes", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest
        .fn()
        .mockResolvedValue(
          buildFakeCampaign({ name: "Antigo", subject: "Assunto antigo" }),
        ),
    });
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(
      buildInput({ patch: { name: "  Novo nome  ", subject: "   " } }),
    );

    expect(repo.update).toHaveBeenCalledWith("campaign-1", "org-1", {
      name: "Novo nome",
      subject: null,
    });
  });

  it("campanha inactivity: patch { inactivityMonths: null } lança CampaignInvalidInactivityMonthsException", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest
        .fn()
        .mockResolvedValue(
          buildFakeCampaign({ trigger: "inactivity", inactivityMonths: 6 }),
        ),
    });
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await expect(
      useCase.execute(buildInput({ patch: { inactivityMonths: null } })),
    ).rejects.toThrow(CampaignInvalidInactivityMonthsException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("campanha não-inactivity: ignora inactivityMonths do patch (não escreve a coluna)", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest
        .fn()
        .mockResolvedValue(buildFakeCampaign({ trigger: "birthday" })),
    });
    const useCase = new UpdateCampaignUseCase(
      repo,
      buildOrgRepo(),
      buildFakeAuditService(),
      buildConfig(),
    );

    await useCase.execute(buildInput({ patch: { inactivityMonths: 12 } }));

    expect(repo.update).toHaveBeenCalledWith("campaign-1", "org-1", {});
  });
});
