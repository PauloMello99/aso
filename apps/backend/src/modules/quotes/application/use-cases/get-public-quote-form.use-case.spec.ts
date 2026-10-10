import { GetPublicQuoteFormUseCase } from "./get-public-quote-form.use-case";
import { IQuoteFormRepository } from "../../domain/quote-form.repository.interface";
import { QuoteFormNotFoundException } from "../../domain/exceptions/quote-form-not-found.exception";
import { QUOTE_CONSENT_VERSION } from "../../domain/build-quote-consent-text";

function buildFakeFormRepo(
  overrides: Partial<jest.Mocked<IQuoteFormRepository>> = {},
): jest.Mocked<IQuoteFormRepository> {
  return {
    findMemberContext: jest.fn(),
    findByOrgAndUser: jest.fn(),
    upsertForMember: jest.fn(),
    findPublicBySlugAsAdmin: jest.fn().mockResolvedValue({
      formId: "form-1",
      orgId: "org-1",
      targetUserId: "user-1",
      orgName: "Estudio Ink",
      displayName: "Maria",
    }),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteFormRepository>;
}

describe("GetPublicQuoteFormUseCase", () => {
  it("returns only the public view, without internal ids or slug", async () => {
    const repo = buildFakeFormRepo();
    const result = await new GetPublicQuoteFormUseCase(repo).execute("Maria");
    expect(repo.findPublicBySlugAsAdmin).toHaveBeenCalledWith("maria");
    expect(Object.keys(result).sort()).toEqual([
      "consent",
      "professionalName",
      "studioName",
    ]);
    expect(result.studioName).toBe("Estudio Ink");
    expect(result.professionalName).toBe("Maria");
    expect(result.consent.version).toBe(QUOTE_CONSENT_VERSION);
    expect(result.consent.privacyText).toContain("Estudio Ink");
    expect(JSON.stringify(result)).not.toMatch(/org-1|user-1|form-1/);
  });

  it("throws not found when no public form matches", async () => {
    const repo = buildFakeFormRepo({
      findPublicBySlugAsAdmin: jest.fn().mockResolvedValue(null),
    });
    await expect(
      new GetPublicQuoteFormUseCase(repo).execute("maria"),
    ).rejects.toBeInstanceOf(QuoteFormNotFoundException);
  });

  it("throws not found for an invalid slug without querying", async () => {
    const repo = buildFakeFormRepo();
    await expect(
      new GetPublicQuoteFormUseCase(repo).execute("a--b"),
    ).rejects.toBeInstanceOf(QuoteFormNotFoundException);
    expect(repo.findPublicBySlugAsAdmin).not.toHaveBeenCalled();
  });
});
