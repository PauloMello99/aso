import { UpsertMyQuoteFormUseCase } from "./upsert-my-quote-form.use-case";
import { IQuoteFormRepository } from "../../domain/quote-form.repository.interface";
import { QuoteFormSlugUnavailableException } from "../../domain/exceptions/quote-form-slug-unavailable.exception";
import { QuoteFormMembershipRequiredException } from "../../domain/exceptions/quote-form-membership-required.exception";
import { QuoteRequestInvalidException } from "../../domain/exceptions/quote-request-invalid.exception";

function buildFakeFormRepo(
  overrides: Partial<jest.Mocked<IQuoteFormRepository>> = {},
): jest.Mocked<IQuoteFormRepository> {
  return {
    findMemberContext: jest.fn().mockResolvedValue({ userId: "user-1" }),
    findByOrgAndUser: jest.fn(),
    upsertForMember: jest
      .fn()
      .mockImplementation(async (data) => ({
        slug: data.slug,
        displayName: data.displayName,
        enabled: data.enabled,
      })),
    findPublicBySlugAsAdmin: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteFormRepository>;
}

const baseInput = {
  orgId: "org-1",
  authId: "auth-1",
  slug: "maria-tattoo",
  displayName: "Maria",
  enabled: true,
};

describe("UpsertMyQuoteFormUseCase", () => {
  it("saves the form for the member", async () => {
    const repo = buildFakeFormRepo();
    const result = await new UpsertMyQuoteFormUseCase(repo).execute(baseInput);
    expect(result).toEqual({
      slug: "maria-tattoo",
      displayName: "Maria",
      enabled: true,
    });
    expect(repo.upsertForMember).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      slug: "maria-tattoo",
      displayName: "Maria",
      enabled: true,
    });
  });

  it("normalizes slug to lowercase and trims the display name", async () => {
    const repo = buildFakeFormRepo();
    await new UpsertMyQuoteFormUseCase(repo).execute({
      ...baseInput,
      slug: "  Maria-Tattoo ",
      displayName: "  Maria  ",
    });
    expect(repo.upsertForMember).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "maria-tattoo", displayName: "Maria" }),
    );
  });

  it("rejects an invalid slug format without touching the repository", async () => {
    const repo = buildFakeFormRepo();
    await expect(
      new UpsertMyQuoteFormUseCase(repo).execute({ ...baseInput, slug: "a--b" }),
    ).rejects.toMatchObject({
      code: "QUOTE_REQUEST_INVALID",
      details: { reason: "slug_invalid" },
    });
    expect(repo.findMemberContext).not.toHaveBeenCalled();
  });

  it("rejects a reserved slug", async () => {
    const repo = buildFakeFormRepo();
    await expect(
      new UpsertMyQuoteFormUseCase(repo).execute({ ...baseInput, slug: "admin" }),
    ).rejects.toBeInstanceOf(QuoteFormSlugUnavailableException);
    expect(repo.upsertForMember).not.toHaveBeenCalled();
  });

  it("propagates slug unavailable from the repository", async () => {
    const repo = buildFakeFormRepo({
      upsertForMember: jest
        .fn()
        .mockRejectedValue(new QuoteFormSlugUnavailableException()),
    });
    await expect(
      new UpsertMyQuoteFormUseCase(repo).execute(baseInput),
    ).rejects.toBeInstanceOf(QuoteFormSlugUnavailableException);
  });

  it("requires membership", async () => {
    const repo = buildFakeFormRepo({
      findMemberContext: jest.fn().mockResolvedValue(null),
    });
    await expect(
      new UpsertMyQuoteFormUseCase(repo).execute(baseInput),
    ).rejects.toBeInstanceOf(QuoteFormMembershipRequiredException);
    expect(repo.upsertForMember).not.toHaveBeenCalled();
  });

  it("keeps the exception type for invalid slug", async () => {
    await expect(
      new UpsertMyQuoteFormUseCase(buildFakeFormRepo()).execute({
        ...baseInput,
        slug: "-x-",
      }),
    ).rejects.toBeInstanceOf(QuoteRequestInvalidException);
  });
});
