import { ListQuoteRequestsUseCase } from "./list-quote-requests.use-case";
import { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";

function buildFakeMembers(
  member: { role: "owner" | "employee"; userId: string; enabled: boolean } | null,
): jest.Mocked<IMemberRepository> {
  return {
    findByAuthId: jest.fn().mockResolvedValue(member),
  } as unknown as jest.Mocked<IMemberRepository>;
}

function buildFakeRequests(total = 0, items: unknown[] = []) {
  return {
    listForViewer: jest.fn().mockResolvedValue({ items, total }),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
}

function buildItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    targetUserId: "user-1",
    targetDisplayName: "Maria Tattoo",
    requesterName: "Joao",
    idea: "x".repeat(300),
    status: "new",
    viewedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-31T00:00:00Z"),
    imageCount: 2,
    ...overrides,
  };
}

describe("ListQuoteRequestsUseCase", () => {
  it("funcionario lista so o proprio escopo", async () => {
    const requests = buildFakeRequests();
    const members = buildFakeMembers({ role: "employee", userId: "user-2", enabled: true });
    await new ListQuoteRequestsUseCase(requests, members).execute({
      orgId: "org-1",
      authId: "auth-1",
    });
    expect(requests.listForViewer).toHaveBeenCalledWith(
      "org-1",
      { kind: "own", userId: "user-2" },
      { limit: 20, offset: 0, unreadOnly: false },
    );
  });

  it("owner/super_admin (sintetizado como owner) ve todos", async () => {
    const requests = buildFakeRequests();
    const members = buildFakeMembers({ role: "owner", userId: "user-9", enabled: true });
    await new ListQuoteRequestsUseCase(requests, members).execute({
      orgId: "org-1",
      authId: "auth-1",
    });
    expect(requests.listForViewer.mock.calls[0]![1]).toEqual({ kind: "all" });
  });

  it("clampa page e limit e calcula offset e pages", async () => {
    const requests = buildFakeRequests(101);
    const members = buildFakeMembers({ role: "owner", userId: "u", enabled: true });
    const useCase = new ListQuoteRequestsUseCase(requests, members);

    const out = await useCase.execute({
      orgId: "org-1",
      authId: "a",
      page: 3,
      limit: 500,
    });
    expect(requests.listForViewer.mock.calls[0]![2]).toEqual({
      limit: 50,
      offset: 100,
      unreadOnly: false,
    });
    expect(out).toMatchObject({ page: 3, limit: 50, total: 101, pages: 3 });

    await useCase.execute({ orgId: "org-1", authId: "a", page: -4, limit: 0 });
    expect(requests.listForViewer.mock.calls[1]![2]).toEqual({
      limit: 1,
      offset: 0,
      unreadOnly: false,
    });
  });

  it("pages e no minimo 1 com lista vazia", async () => {
    const out = await new ListQuoteRequestsUseCase(
      buildFakeRequests(0),
      buildFakeMembers({ role: "owner", userId: "u", enabled: true }),
    ).execute({ orgId: "org-1", authId: "a" });
    expect(out.pages).toBe(1);
  });

  it("mapeia viewed, datas ISO e preview da ideia", async () => {
    const out = await new ListQuoteRequestsUseCase(
      buildFakeRequests(2, [
        buildItem(),
        buildItem({ id: "r-2", viewedAt: new Date("2026-10-02T00:00:00Z") }),
      ]),
      buildFakeMembers({ role: "owner", userId: "u", enabled: true }),
    ).execute({ orgId: "org-1", authId: "a" });
    expect(out.items[0]).toMatchObject({
      id: "r-1",
      targetDisplayName: "Maria Tattoo",
      viewed: false,
      imageCount: 2,
      createdAt: "2026-10-01T00:00:00.000Z",
      expiresAt: "2026-10-31T00:00:00.000Z",
    });
    expect(out.items[0]!.ideaPreview).toHaveLength(160);
    expect(out.items[1]!.viewed).toBe(true);
  });

  it.each([
    ["sem membership", null],
    ["membership desabilitada", { role: "employee" as const, userId: "u", enabled: false }],
  ])("%s => 404", async (_label, member) => {
    const requests = buildFakeRequests();
    await expect(
      new ListQuoteRequestsUseCase(requests, buildFakeMembers(member)).execute({
        orgId: "org-1",
        authId: "a",
      }),
    ).rejects.toBeInstanceOf(QuoteRequestNotFoundException);
    expect(requests.listForViewer).not.toHaveBeenCalled();
  });
});
