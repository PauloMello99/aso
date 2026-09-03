import { DomainException } from "../../../../common/exceptions/domain.exception";
import type { ICustomerEmailPreferenceRepository } from "../../domain/customer-email-preference.repository.interface";
import { UnsubscribeFromCampaignsUseCase } from "./unsubscribe-from-campaigns.use-case";

function buildPrefRepo(
  overrides: Partial<jest.Mocked<ICustomerEmailPreferenceRepository>> = {},
): jest.Mocked<ICustomerEmailPreferenceRepository> {
  return {
    ensureForCustomer: jest.fn(),
    findByUnsubscribeToken: jest.fn(),
    unsubscribeAll: jest.fn().mockResolvedValue(true),
    unsubscribeTrigger: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerEmailPreferenceRepository>;
}

describe("UnsubscribeFromCampaignsUseCase", () => {
  it("sem trigger chama unsubscribeAll com o token e um Date", async () => {
    const prefRepo = buildPrefRepo();
    const useCase = new UnsubscribeFromCampaignsUseCase(prefRepo);

    await useCase.execute("tok-abc");

    expect(prefRepo.unsubscribeAll).toHaveBeenCalledWith(
      "tok-abc",
      expect.any(Date),
    );
    expect(prefRepo.unsubscribeTrigger).not.toHaveBeenCalled();
  });

  it("com trigger chama unsubscribeTrigger(token, trigger)", async () => {
    const prefRepo = buildPrefRepo();
    const useCase = new UnsubscribeFromCampaignsUseCase(prefRepo);

    await useCase.execute("tok-abc", "birthday");

    expect(prefRepo.unsubscribeTrigger).toHaveBeenCalledWith(
      "tok-abc",
      "birthday",
    );
    expect(prefRepo.unsubscribeAll).not.toHaveBeenCalled();
  });

  it("lança CAMPAIGN_PREFERENCES_NOT_FOUND quando o repo devolve false", async () => {
    const prefRepo = buildPrefRepo({
      unsubscribeAll: jest.fn().mockResolvedValue(false),
    });
    const useCase = new UnsubscribeFromCampaignsUseCase(prefRepo);

    await expect(useCase.execute("tok-missing")).rejects.toMatchObject({
      code: "CAMPAIGN_PREFERENCES_NOT_FOUND",
    });
    await expect(useCase.execute("tok-missing")).rejects.toBeInstanceOf(
      DomainException,
    );
  });

  it("é idempotente: 2ª chamada com o repo devolvendo true de novo não lança", async () => {
    const prefRepo = buildPrefRepo();
    const useCase = new UnsubscribeFromCampaignsUseCase(prefRepo);

    await useCase.execute("tok-abc");
    await expect(useCase.execute("tok-abc")).resolves.toBeUndefined();
    expect(prefRepo.unsubscribeAll).toHaveBeenCalledTimes(2);
  });
});
