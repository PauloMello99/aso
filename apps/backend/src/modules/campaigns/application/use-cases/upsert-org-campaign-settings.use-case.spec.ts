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
    findByOrgId: jest.fn(),
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
  it("lança CampaignSettingsForbiddenException quando o autor não é owner e nunca escreve", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo({
      isOwner: jest.fn().mockResolvedValue(false),
    });
    const useCase = new UpsertOrgCampaignSettingsUseCase(repo, orgRepo);

    await expect(
      useCase.execute(buildInput({ authId: "not-owner" })),
    ).rejects.toBeInstanceOf(CampaignSettingsForbiddenException);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("normaliza vazio/whitespace dos 6 campos de texto para null", async () => {
    const repo = buildRepo();
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(repo, orgRepo);

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
    const useCase = new UpsertOrgCampaignSettingsUseCase(repo, orgRepo);

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
    const useCase = new UpsertOrgCampaignSettingsUseCase(repo, orgRepo);

    await useCase.execute(buildInput({ inactivityMonths: 50 }));
    await useCase.execute(buildInput({ inactivityMonths: 0 }));

    expect(repo.upsert.mock.calls[0]![1].inactivityMonths).toBe(36);
    expect(repo.upsert.mock.calls[1]![1].inactivityMonths).toBe(1);
  });

  it("passa flags e devolve a View do repositório", async () => {
    const view = buildView({ postServiceEnabled: true, inactivityMonths: 12 });
    const repo = buildRepo({ upsert: jest.fn().mockResolvedValue(view) });
    const orgRepo = buildOrgRepo();
    const useCase = new UpsertOrgCampaignSettingsUseCase(repo, orgRepo);

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
});
