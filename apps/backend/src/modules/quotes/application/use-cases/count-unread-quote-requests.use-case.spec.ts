import { CountUnreadQuoteRequestsUseCase } from "./count-unread-quote-requests.use-case";
import { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";

function build(member: { role: string; userId: string; enabled: boolean } | null) {
  const requests = {
    countUnreadForViewer: jest.fn().mockResolvedValue(3),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
  const members = {
    findByAuthId: jest.fn().mockResolvedValue(member),
  } as unknown as jest.Mocked<IMemberRepository>;
  return { requests, useCase: new CountUnreadQuoteRequestsUseCase(requests, members) };
}

describe("CountUnreadQuoteRequestsUseCase", () => {
  it("funcionario conta so os proprios", async () => {
    const { useCase, requests } = build({ role: "employee", userId: "user-2", enabled: true });
    await expect(useCase.execute({ orgId: "org-1", authId: "a" })).resolves.toEqual({
      unread: 3,
    });
    expect(requests.countUnreadForViewer).toHaveBeenCalledWith("org-1", {
      kind: "own",
      userId: "user-2",
    });
  });

  it("owner conta todos da org", async () => {
    const { useCase, requests } = build({ role: "owner", userId: "u", enabled: true });
    await useCase.execute({ orgId: "org-1", authId: "a" });
    expect(requests.countUnreadForViewer).toHaveBeenCalledWith("org-1", { kind: "all" });
  });

  it("sem membership => 404", async () => {
    const { useCase, requests } = build(null);
    await expect(useCase.execute({ orgId: "org-1", authId: "a" })).rejects.toBeInstanceOf(
      QuoteRequestNotFoundException,
    );
    expect(requests.countUnreadForViewer).not.toHaveBeenCalled();
  });
});
