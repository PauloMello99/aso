import { AuditService } from "../../../audit/audit.service";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { CampaignSettingsForbiddenException } from "../../domain/exceptions/campaign-settings-forbidden.exception";
import type {
  IOrgCampaignSettingsWriteRepository,
  OrgCampaignSettingsView,
} from "../../domain/org-campaign-settings.repository.interface";
import {
  UpsertOrgCampaignSettingsInput,
  UpsertOrgCampaignSettingsUseCase,
} from "./upsert-org-campaign-settings.use-case";

function buildView(
  overrides: Partial<OrgCampaignSettingsView> = {},
): OrgCampaignSettingsView {
  return {
    orgId: "org-1",
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
    ...overrides,
  };
}

function buildRepo(
  overrides: Partial<jest.Mocked<IOrgCampaignSettingsWriteRepository>> = {},
): jest.Mocked<IOrgCampaignSettingsWriteRepository> {
  return {
    findByOrgId: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(buildView()),
    ...overrides,
  } as unknown as jest.Mocked<IOrgCampaignSettingsWriteRepository>;
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

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

function buildInput(
  overrides: Partial<UpsertOrgCampaignSettingsInput> = {},
): UpsertOrgCampaignSettingsInput {
  return {
    orgId: "org-1",
    authId: "owner-1",
    postServiceEnabled: true,
    birthdayEnabled: false,
    inactivityEnabled: true,
    inactivityMonths: 6,
    postServiceSubject: null,
    postServiceBody: null,
    birthdaySubject: null,
    birthdayBody: null,
    inactivitySubject: null,
    inactivityBody: null,
    ...overrides,
  };
}

describe("UpsertOrgCampaignSettingsUseCase", () => {
  it("lança CampaignSettingsForbiddenException quando o autor não é owner, nunca escreve e nunca audita", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo({
      isOwner: jest.fn().mockResolvedValue(false),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      auditService,
    );

    await expect(
      useCase.execute(buildInput({ authId: "not-owner" })),
    ).rejects.toBeInstanceOf(CampaignSettingsForbiddenException);
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("normaliza vazio/whitespace dos 6 campos de texto para null", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      buildFakeAuditService(),
    );

    await useCase.execute(
      buildInput({
        postServiceSubject: "",
        postServiceBody: "   ",
        birthdaySubject: "\t\n",
        birthdayBody: "",
        inactivitySubject: "  \r ",
        inactivityBody: "",
      }),
    );

    const [, data] = repo.upsert.mock.calls[0]!;
    expect(data.postServiceSubject).toBeNull();
    expect(data.postServiceBody).toBeNull();
    expect(data.birthdaySubject).toBeNull();
    expect(data.birthdayBody).toBeNull();
    expect(data.inactivitySubject).toBeNull();
    expect(data.inactivityBody).toBeNull();
  });

  it("preserva texto real com trim nas bordas", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      buildFakeAuditService(),
    );

    await useCase.execute(
      buildInput({
        postServiceSubject: "  Como foi?  ",
        inactivityBody: "\nSentimos sua falta.\n",
      }),
    );

    const [orgId, data] = repo.upsert.mock.calls[0]!;
    expect(orgId).toBe("org-1");
    expect(data.postServiceSubject).toBe("Como foi?");
    expect(data.inactivityBody).toBe("Sentimos sua falta.");
  });

  it("clampa inactivityMonths para a faixa 1-36", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      buildFakeAuditService(),
    );

    await useCase.execute(buildInput({ inactivityMonths: 50 }));
    await useCase.execute(buildInput({ inactivityMonths: 0 }));

    expect(repo.upsert.mock.calls[0]![1].inactivityMonths).toBe(36);
    expect(repo.upsert.mock.calls[1]![1].inactivityMonths).toBe(1);
  });

  it("passa flags e devolve a View do repositório", async () => {
    const view = buildView({ postServiceEnabled: true, inactivityMonths: 12 });
    const repo = buildRepo({ upsert: jest.fn().mockResolvedValue(view) });
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      buildFakeAuditService(),
    );

    const result = await useCase.execute(
      buildInput({
        postServiceEnabled: true,
        birthdayEnabled: false,
        inactivityEnabled: true,
        inactivityMonths: 12,
      }),
    );

    const data = repo.upsert.mock.calls[0]![1];
    expect(data).toMatchObject({
      postServiceEnabled: true,
      birthdayEnabled: false,
      inactivityEnabled: true,
      inactivityMonths: 12,
    });
    expect(result).toEqual(view);
  });

  it("audita campaign_settings_updated 1x com metadata sem strings de assunto/corpo", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      auditService,
    );

    await useCase.execute(
      buildInput({
        postServiceEnabled: true,
        inactivityEnabled: true,
        inactivityMonths: 9,
        postServiceSubject: "Como foi seu atendimento, {{customerName}}?",
        inactivityBody: "Faz tempo que não te vemos!",
      }),
    );

    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    const [authId, entry] = auditService.logByAuthId.mock.calls[0]!;
    expect(authId).toBe("owner-1");
    expect(entry.action).toBe("campaign_settings_updated");
    expect(entry.orgId).toBe("org-1");
    expect(entry.entityId).toBe("org-1");

    const serialized = JSON.stringify(entry.metadata);
    expect(serialized).not.toContain("Como foi seu atendimento");
    expect(serialized).not.toContain("Faz tempo que não te vemos");

    const metadata = entry.metadata as Record<string, unknown>;
    expect(metadata.changed).toEqual(
      expect.arrayContaining([
        "postServiceEnabled",
        "inactivityEnabled",
        "inactivityMonths",
        "postServiceSubject",
        "inactivityBody",
      ]),
    );
    expect(metadata.postServiceEnabled).toBe(true);
    expect(metadata.inactivityMonths).toBe(9);
  });

  it("audita após o upsert resolver (não audita uma escrita que falhou)", async () => {
    const repo = buildRepo({
      upsert: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const orgRepo = buildOrgRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertOrgCampaignSettingsUseCase(
      repo,
      orgRepo,
      auditService,
    );

    await expect(useCase.execute(buildInput())).rejects.toThrow("db down");
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });
});
