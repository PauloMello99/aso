import { DomainException } from "../../../../common/exceptions/domain.exception";
import type {
  CustomerEmailPreferenceView,
  ICustomerEmailPreferenceRepository,
} from "../../domain/customer-email-preference.repository.interface";
import { GetEmailPreferencesUseCase } from "./get-email-preferences.use-case";

function buildPrefRepo(
  overrides: Partial<jest.Mocked<ICustomerEmailPreferenceRepository>> = {},
): jest.Mocked<ICustomerEmailPreferenceRepository> {
  return {
    ensureForCustomer: jest.fn(),
    findByUnsubscribeToken: jest.fn(),
    unsubscribeAll: jest.fn(),
    unsubscribeTrigger: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerEmailPreferenceRepository>;
}

function buildView(
  overrides: Partial<CustomerEmailPreferenceView> = {},
): CustomerEmailPreferenceView {
  return {
    orgId: "org-1",
    orgName: "Studio X",
    postServiceEnabled: true,
    birthdayEnabled: false,
    inactivityEnabled: true,
    unsubscribedAll: false,
    ...overrides,
  };
}

describe("GetEmailPreferencesUseCase", () => {
  it("devolve só os 5 campos não identificantes (sem orgId)", async () => {
    const prefRepo = buildPrefRepo({
      findByUnsubscribeToken: jest.fn().mockResolvedValue(buildView()),
    });
    const useCase = new GetEmailPreferencesUseCase(prefRepo);

    const result = await useCase.execute("tok-abc");

    expect(prefRepo.findByUnsubscribeToken).toHaveBeenCalledWith("tok-abc");
    expect(result).toEqual({
      orgName: "Studio X",
      postServiceEnabled: true,
      birthdayEnabled: false,
      inactivityEnabled: true,
      unsubscribedAll: false,
    });
    expect(result).not.toHaveProperty("orgId");
  });

  it("lança CAMPAIGN_PREFERENCES_NOT_FOUND quando o token não existe", async () => {
    const prefRepo = buildPrefRepo({
      findByUnsubscribeToken: jest.fn().mockResolvedValue(null),
    });
    const useCase = new GetEmailPreferencesUseCase(prefRepo);

    await expect(useCase.execute("tok-missing")).rejects.toMatchObject({
      code: "CAMPAIGN_PREFERENCES_NOT_FOUND",
    });
    await expect(useCase.execute("tok-missing")).rejects.toBeInstanceOf(
      DomainException,
    );
  });
});
