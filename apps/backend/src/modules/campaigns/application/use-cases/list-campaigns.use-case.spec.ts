import type { ConfigService } from "@nestjs/config";
import { validateCampaignBody } from "../../domain/campaign-body";
import { CAMPAIGN_DEFAULT_COPY } from "../../domain/campaign-copy";
import type { Campaign } from "../../domain/campaign.entity";
import type { ICampaignRepository } from "../../domain/campaign.repository.interface";
import { ListCampaignsUseCase } from "./list-campaigns.use-case";

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
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignRepository>;
}

function buildConfig(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const map: Record<string, string | undefined> = {
    CAMPAIGNS_ENABLED: "true",
    ...overrides,
  };
  return {
    get: jest.fn((key: string, dflt?: string) => map[key] ?? dflt),
  } as unknown as ConfigService;
}

describe("ListCampaignsUseCase", () => {
  it("devolve as campanhas da org e os defaults dos 3 gatilhos em Tiptap-JSON", async () => {
    const campaign = buildFakeCampaign({ trigger: "birthday" });
    const repo = buildRepo({
      findAllByOrg: jest.fn().mockResolvedValue([campaign]),
    });
    const useCase = new ListCampaignsUseCase(repo, buildConfig());

    const result = await useCase.execute("org-1");

    expect(repo.findAllByOrg).toHaveBeenCalledWith("org-1");
    expect(result.campaigns).toEqual([campaign]);
    expect(Object.keys(result.defaults).sort()).toEqual([
      "birthday",
      "inactivity",
      "post_service",
    ]);
    for (const trigger of ["post_service", "birthday", "inactivity"] as const) {
      expect(result.defaults[trigger].body.type).toBe("doc");
      expect(result.defaults[trigger].subject).toBe(
        CAMPAIGN_DEFAULT_COPY[trigger].subject,
      );
    }
  });

  it("availableTriggers exclui os gatilhos que já têm campanha", async () => {
    const repo = buildRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([
          buildFakeCampaign({ trigger: "post_service" }),
          buildFakeCampaign({ id: "campaign-2", trigger: "inactivity" }),
        ]),
    });
    const useCase = new ListCampaignsUseCase(repo, buildConfig());

    const result = await useCase.execute("org-1");

    expect(result.availableTriggers).toEqual(["birthday"]);
  });

  it("availableTriggers tem os 3 gatilhos quando a org não criou nenhuma campanha", async () => {
    const useCase = new ListCampaignsUseCase(buildRepo(), buildConfig());

    const result = await useCase.execute("org-1");

    expect(result.availableTriggers.sort()).toEqual([
      "birthday",
      "inactivity",
      "post_service",
    ]);
  });

  it("o body default de cada gatilho passa na allowlist de validateCampaignBody", async () => {
    const useCase = new ListCampaignsUseCase(buildRepo(), buildConfig());

    const result = await useCase.execute("org-1");

    for (const trigger of ["post_service", "birthday", "inactivity"] as const) {
      expect(() =>
        validateCampaignBody(result.defaults[trigger].body),
      ).not.toThrow();
    }
  });

  it("campaignsEnabled reflete o kill-switch global CAMPAIGNS_ENABLED", async () => {
    const enabled = await new ListCampaignsUseCase(
      buildRepo(),
      buildConfig({ CAMPAIGNS_ENABLED: "true" }),
    ).execute("org-1");
    const disabled = await new ListCampaignsUseCase(
      buildRepo(),
      buildConfig({ CAMPAIGNS_ENABLED: "false" }),
    ).execute("org-1");
    const unset = await new ListCampaignsUseCase(
      buildRepo(),
      buildConfig({ CAMPAIGNS_ENABLED: undefined }),
    ).execute("org-1");

    expect(enabled.campaignsEnabled).toBe(true);
    expect(disabled.campaignsEnabled).toBe(false);
    expect(unset.campaignsEnabled).toBe(false);
  });
});
