import { AuditService } from "../../../audit/audit.service";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import type { Campaign } from "../../domain/campaign.entity";
import type { ICampaignRepository } from "../../domain/campaign.repository.interface";
import { CampaignNotFoundException } from "../../domain/exceptions/campaign-not-found.exception";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import {
  DeleteCampaignInput,
  DeleteCampaignUseCase,
} from "./delete-campaign.use-case";

function buildFakeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    orgId: "org-1",
    trigger: "inactivity",
    name: "Reativação",
    enabled: true,
    subject: null,
    body: null,
    inactivityMonths: 6,
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
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(true),
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

function buildInput(
  overrides: Partial<DeleteCampaignInput> = {},
): DeleteCampaignInput {
  return {
    orgId: "org-1",
    authId: "owner-1",
    id: "campaign-1",
    ...overrides,
  };
}

describe("DeleteCampaignUseCase", () => {
  it("owner deleta e audita operation 'deleted' com o trigger da campanha", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest
        .fn()
        .mockResolvedValue(buildFakeCampaign({ trigger: "birthday" })),
    });
    const auditService = buildFakeAuditService();
    const useCase = new DeleteCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
    );

    await useCase.execute(buildInput());

    expect(repo.delete).toHaveBeenCalledWith("campaign-1", "org-1");
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    const [authId, entry] = auditService.logByAuthId.mock.calls[0]!;
    expect(authId).toBe("owner-1");
    expect(entry.action).toBe("campaign_settings_updated");
    expect(entry.entityType).toBe("campaign");
    expect(entry.entityId).toBe("campaign-1");
    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata).toEqual({
      operation: "deleted",
      trigger: "birthday",
      campaignId: "campaign-1",
    });
  });

  it("campanha inexistente lança CampaignNotFoundException e não deleta nem audita", async () => {
    const repo = buildRepo({
      findByIdAndOrg: jest.fn().mockResolvedValue(null),
    });
    const auditService = buildFakeAuditService();
    const useCase = new DeleteCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CampaignNotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("repo.delete devolve false (corrida) lança CampaignNotFoundException", async () => {
    const repo = buildRepo({ delete: jest.fn().mockResolvedValue(false) });
    const auditService = buildFakeAuditService();
    const useCase = new DeleteCampaignUseCase(
      repo,
      buildOrgRepo(),
      auditService,
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CampaignNotFoundException,
    );
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("não-owner lança CampaignSettingsForbiddenException e não toca o repo", async () => {
    const repo = buildRepo();
    const useCase = new DeleteCampaignUseCase(
      repo,
      buildOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) }),
      buildFakeAuditService(),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CampaignSettingsForbiddenException,
    );
    expect(repo.findByIdAndOrg).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
