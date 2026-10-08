import { GetMyQuoteFormUseCase } from "./get-my-quote-form.use-case";
import { IQuoteFormRepository } from "../../domain/quote-form.repository.interface";

function buildFakeFormRepo(
  overrides: Partial<jest.Mocked<IQuoteFormRepository>> = {},
): jest.Mocked<IQuoteFormRepository> {
  return {
    findMemberContext: jest.fn().mockResolvedValue({ userId: "user-1" }),
    findByOrgAndUser: jest.fn().mockResolvedValue(null),
    upsertForMember: jest.fn(),
    findPublicBySlugAsAdmin: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IQuoteFormRepository>;
}

describe("GetMyQuoteFormUseCase", () => {
  it("returns the member's form", async () => {
    const form = { slug: "maria", displayName: "Maria", enabled: true };
    const repo = buildFakeFormRepo({
      findByOrgAndUser: jest.fn().mockResolvedValue(form),
    });
    const result = await new GetMyQuoteFormUseCase(repo).execute({
      orgId: "org-1",
      authId: "auth-1",
    });
    expect(result).toEqual({ form, canConfigure: true });
    expect(repo.findByOrgAndUser).toHaveBeenCalledWith("org-1", "user-1");
  });

  it("returns form null when the member has none yet", async () => {
    const result = await new GetMyQuoteFormUseCase(buildFakeFormRepo()).execute(
      { orgId: "org-1", authId: "auth-1" },
    );
    expect(result).toEqual({ form: null, canConfigure: true });
  });

  it("returns canConfigure false without membership", async () => {
    const repo = buildFakeFormRepo({
      findMemberContext: jest.fn().mockResolvedValue(null),
    });
    const result = await new GetMyQuoteFormUseCase(repo).execute({
      orgId: "org-1",
      authId: "auth-1",
    });
    expect(result).toEqual({ form: null, canConfigure: false });
    expect(repo.findByOrgAndUser).not.toHaveBeenCalled();
  });
});
