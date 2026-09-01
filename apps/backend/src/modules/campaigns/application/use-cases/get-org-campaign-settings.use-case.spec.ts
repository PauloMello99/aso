import type { ConfigService } from "@nestjs/config";
import { CAMPAIGN_DEFAULT_COPY } from "../../domain/campaign-copy";
import type {
  IOrgCampaignSettingsWriteRepository,
  OrgCampaignSettingsView,
} from "../../domain/org-campaign-settings.repository.interface";
import { GetOrgCampaignSettingsUseCase } from "./get-org-campaign-settings.use-case";

function buildRepo(
  overrides: Partial<jest.Mocked<IOrgCampaignSettingsWriteRepository>> = {},
): jest.Mocked<IOrgCampaignSettingsWriteRepository> {
  return {
    findByOrgId: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrgCampaignSettingsWriteRepository>;
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

function buildView(
  overrides: Partial<OrgCampaignSettingsView> = {},
): OrgCampaignSettingsView {
  return {
    orgId: "org-1",
    postServiceEnabled: true,
    birthdayEnabled: true,
    inactivityEnabled: false,
    inactivityMonths: 9,
    postServiceSubject: "Oi {{customerName}}",
    postServiceBody: "Corpo custom",
    birthdaySubject: null,
    birthdayBody: null,
    inactivitySubject: null,
    inactivityBody: null,
    ...overrides,
  };
}

describe("GetOrgCampaignSettingsUseCase", () => {
  it("devolve a linha existente quando há configuração", async () => {
    const view = buildView();
    const repo = buildRepo({
      findByOrgId: jest.fn().mockResolvedValue(view),
    });
    const useCase = new GetOrgCampaignSettingsUseCase(repo, buildConfig());

    const result = await useCase.execute("org-1");

    expect(repo.findByOrgId).toHaveBeenCalledWith("org-1");
    expect(result).toEqual({
      ...view,
      defaults: CAMPAIGN_DEFAULT_COPY,
      campaignsEnabled: true,
    });
    expect(result.defaults.post_service.subject).toBe(
      CAMPAIGN_DEFAULT_COPY.post_service.subject,
    );
  });

  it("devolve os DEFAULTS sem criar linha quando a org não configurou nada", async () => {
    const repo = buildRepo({
      findByOrgId: jest.fn().mockResolvedValue(null),
    });
    const useCase = new GetOrgCampaignSettingsUseCase(repo, buildConfig());

    const result = await useCase.execute("org-42");

    expect(result).toEqual({
      orgId: "org-42",
      postServiceEnabled: false,
      birthdayEnabled: false,
      inactivityEnabled: false,
      inactivityMonths: 6,
      postServiceSubject: null,
      postServiceBody: null,
      birthdaySubject: null,
      birthdayBody: null,
      inactivitySubject: null,
      inactivityBody: null,
      defaults: CAMPAIGN_DEFAULT_COPY,
      campaignsEnabled: true,
    });
    expect(result.defaults.post_service.subject).toBe(
      CAMPAIGN_DEFAULT_COPY.post_service.subject,
    );
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("campaignsEnabled = true quando CAMPAIGNS_ENABLED === 'true'", async () => {
    const repo = buildRepo({
      findByOrgId: jest.fn().mockResolvedValue(buildView()),
    });
    const useCase = new GetOrgCampaignSettingsUseCase(
      repo,
      buildConfig({ CAMPAIGNS_ENABLED: "true" }),
    );

    const result = await useCase.execute("org-1");

    expect(result.campaignsEnabled).toBe(true);
  });

  it("campaignsEnabled = false quando CAMPAIGNS_ENABLED === 'false'", async () => {
    const repo = buildRepo();
    const useCase = new GetOrgCampaignSettingsUseCase(
      repo,
      buildConfig({ CAMPAIGNS_ENABLED: "false" }),
    );

    const result = await useCase.execute("org-1");

    expect(result.campaignsEnabled).toBe(false);
  });

  it("campaignsEnabled = false quando CAMPAIGNS_ENABLED não está definido", async () => {
    const repo = buildRepo();
    const useCase = new GetOrgCampaignSettingsUseCase(
      repo,
      buildConfig({ CAMPAIGNS_ENABLED: undefined }),
    );

    const result = await useCase.execute("org-1");

    expect(result.campaignsEnabled).toBe(false);
  });
});
