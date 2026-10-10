import { MarkQuoteRequestViewedUseCase } from "./mark-quote-request-viewed.use-case";
import { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";

function build(detail: unknown) {
  const requests = {
    findDetailForViewer: jest.fn().mockResolvedValue(detail),
    markViewed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
  const members = {
    findByAuthId: jest
      .fn()
      .mockResolvedValue({ role: "employee", userId: "user-2", enabled: true }),
  } as unknown as jest.Mocked<IMemberRepository>;
  return { requests, useCase: new MarkQuoteRequestViewedUseCase(requests, members) };
}

describe("MarkQuoteRequestViewedUseCase", () => {
  afterEach(() => jest.useRealTimers());

  it("marca como visto dentro do escopo do ator", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T10:00:00Z"));
    const { useCase, requests } = build({ id: "r-1" });
    await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });
    expect(requests.findDetailForViewer).toHaveBeenCalledWith(
      "org-1",
      { kind: "own", userId: "user-2" },
      "r-1",
    );
    expect(requests.markViewed).toHaveBeenCalledWith(
      "org-1",
      { kind: "own", userId: "user-2" },
      "r-1",
      new Date("2026-10-02T10:00:00Z"),
    );
  });

  it("fora do escopo/expirado/inexistente => 404 sem marcar", async () => {
    const { useCase, requests } = build(null);
    await expect(
      useCase.execute({ orgId: "org-1", authId: "a", id: "r-x" }),
    ).rejects.toBeInstanceOf(QuoteRequestNotFoundException);
    expect(requests.markViewed).not.toHaveBeenCalled();
  });
});
