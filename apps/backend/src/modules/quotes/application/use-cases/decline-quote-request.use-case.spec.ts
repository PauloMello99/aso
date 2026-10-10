import { DeclineQuoteRequestUseCase } from "./decline-quote-request.use-case";
import type { IQuoteRequestRepository } from "../../domain/quote-request.repository.interface";
import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import type { AuditService } from "../../../audit/audit.service";
import type { QuoteRequestCloser } from "../quote-request-closer";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

function buildFakeDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    targetUserId: "user-2",
    targetDisplayName: "Maria",
    requesterName: "Joao Silva",
    requesterPhone: "+5511999998888",
    requesterEmail: "joao@example.com",
    idea: "Um leao no braco",
    status: "new",
    viewedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-31T00:00:00Z"),
    contactRetentionConsentAcceptedAt: null,
    images: [{ id: "i-1" }, { id: "i-2" }],
    ...overrides,
  };
}

function build(
  options: {
    detail?: unknown;
    closeResult?: { contactRetained: boolean; purged: boolean } | null;
    member?: Record<string, unknown>;
  } = {},
) {
  const requests = {
    findDetailForViewer: jest
      .fn()
      .mockResolvedValue("detail" in options ? options.detail : buildFakeDetail()),
  } as unknown as jest.Mocked<IQuoteRequestRepository>;
  const members = {
    findByAuthId: jest.fn().mockResolvedValue(
      options.member ?? { role: "owner", userId: "user-1", enabled: true },
    ),
  } as unknown as jest.Mocked<IMemberRepository>;
  const closer = {
    close: jest.fn().mockResolvedValue(
      "closeResult" in options
        ? options.closeResult
        : { contactRetained: false, purged: true },
    ),
  } as unknown as jest.Mocked<QuoteRequestCloser>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  return {
    requests,
    closer,
    audit,
    useCase: new DeclineQuoteRequestUseCase(requests, members, closer, audit),
  };
}

describe("DeclineQuoteRequestUseCase", () => {
  it("funcionario com pedido alheio => 404 e o closer nao e chamado", async () => {
    const { useCase, closer, audit } = build({
      detail: null,
      member: { role: "employee", userId: "user-9", enabled: true },
    });

    await expect(
      useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" }),
    ).rejects.toBeInstanceOf(QuoteRequestNotFoundException);
    expect(closer.close).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("owner repassa o targetUserId do detalhe", async () => {
    const { useCase, closer } = build();

    await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });

    expect(closer.close).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        id: "r-1",
        targetUserId: "user-2",
        outcome: "not_scheduled",
      }),
    );
  });

  it("closer null => 404 e sem audit", async () => {
    const { useCase, audit } = build({ closeResult: null });

    await expect(
      useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" }),
    ).rejects.toBeInstanceOf(QuoteRequestNotFoundException);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("audita uma vez com metadata exato e sem PII", async () => {
    const { useCase, audit } = build({
      closeResult: { contactRetained: true, purged: true },
    });

    const output = await useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" });

    expect(output).toEqual({ contactRetained: true });
    expect(audit.log).toHaveBeenCalledTimes(1);
    const entry = audit.log.mock.calls[0]?.[0];
    expect(entry).toEqual({
      actorId: "user-1",
      orgId: "org-1",
      action: "quote_request_closed",
      entityType: "quote_request",
      entityId: "r-1",
      metadata: { outcome: "not_scheduled", imageCount: 2, contactRetained: true },
    });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("Joao");
    expect(serialized).not.toContain("joao@example.com");
    expect(serialized).not.toContain("5511999998888");
    expect(serialized).not.toContain("leao");
  });

  it("falha de purga (purged=false) ainda retorna 200: o pedido ja esta na fila", async () => {
    const { useCase, audit } = build({
      closeResult: { contactRetained: false, purged: false },
    });

    await expect(
      useCase.execute({ orgId: "org-1", authId: "a", id: "r-1" }),
    ).resolves.toEqual({ contactRetained: false });
    expect(audit.log).toHaveBeenCalledTimes(1);
  });
});
