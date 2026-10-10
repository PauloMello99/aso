import { Logger } from "@nestjs/common";
import { QuoteRequestCloser } from "./quote-request-closer";
import type { QuoteRequestPurger } from "./quote-request-purger";
import type {
  CloseQuoteRequestInput,
  IQuoteRequestPurgeRepository,
  QuoteRequestPurgeClaim,
} from "../domain/quote-request-purge.repository.interface";
import { registerPostCommit } from "../../../database/database.module";

jest.mock("../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

const registerPostCommitMock = registerPostCommit as jest.MockedFunction<
  typeof registerPostCommit
>;

function buildFakeClaim(
  overrides: Partial<QuoteRequestPurgeClaim> = {},
): QuoteRequestPurgeClaim {
  return {
    id: "req-1",
    orgId: "org-1",
    scope: "all",
    attempts: 1,
    claimedAt: new Date("2026-10-08T12:00:00.000Z"),
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<CloseQuoteRequestInput> = {},
): CloseQuoteRequestInput {
  return {
    orgId: "org-1",
    id: "req-1",
    targetUserId: "user-1",
    outcome: "not_scheduled",
    now: new Date("2026-10-08T12:00:00.000Z"),
    ...overrides,
  };
}

function build(claim: QuoteRequestPurgeClaim | null = buildFakeClaim()) {
  const purgeRepo = {
    closeAndClaim: jest.fn().mockResolvedValue(claim),
    recordPurgeFailure: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IQuoteRequestPurgeRepository>;
  const purger = {
    purge: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<QuoteRequestPurger>;
  return { purgeRepo, purger, closer: new QuoteRequestCloser(purgeRepo, purger) };
}

describe("QuoteRequestCloser", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    registerPostCommitMock.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  describe("close", () => {
    it("closeAndClaim null => null e sem purga", async () => {
      const { closer, purger } = build(null);

      await expect(closer.close(buildInput())).resolves.toBeNull();
      expect(purger.purge).not.toHaveBeenCalled();
    });

    it("escopo images => contactRetained true", async () => {
      const { closer, purger } = build(buildFakeClaim({ scope: "images" }));

      const result = await closer.close(buildInput());

      expect(result).toEqual({ contactRetained: true, purged: true });
      expect(purger.purge).toHaveBeenCalledTimes(1);
    });

    it("escopo all => contactRetained false", async () => {
      const { closer } = build();

      await expect(closer.close(buildInput())).resolves.toEqual({
        contactRetained: false,
        purged: true,
      });
    });

    it("purga falha => registra o codigo e devolve purged=false sem relancar", async () => {
      const { closer, purger, purgeRepo } = build();
      purger.purge.mockRejectedValue(new TypeError("joao@example.com falhou"));

      const result = await closer.close(buildInput());

      expect(result).toEqual({ contactRetained: false, purged: false });
      expect(purgeRepo.recordPurgeFailure).toHaveBeenCalledWith(
        "org-1",
        "req-1",
        "TypeError",
      );
      const logged = JSON.stringify(warn.mock.calls);
      expect(logged).not.toContain("joao@example.com");
    });

    it("recordPurgeFailure tambem falhando nao relanca", async () => {
      const { closer, purger, purgeRepo } = build();
      purger.purge.mockRejectedValue(new Error("x"));
      purgeRepo.recordPurgeFailure.mockRejectedValue(new Error("db"));

      await expect(closer.close(buildInput())).resolves.toEqual({
        contactRetained: false,
        purged: false,
      });
    });

    it("erro de closeAndClaim propaga (nada foi encerrado)", async () => {
      const { closer, purgeRepo } = build();
      purgeRepo.closeAndClaim.mockRejectedValue(new Error("db"));

      await expect(closer.close(buildInput())).rejects.toThrow("db");
    });
  });

  describe("closeAfterCommit", () => {
    function capturedHook(): () => void | Promise<void> {
      const hook = registerPostCommitMock.mock.calls[0]?.[0];
      if (!hook) throw new Error("hook nao registrado");
      return hook;
    }

    it("nada acontece antes do hook; ao invocar, encerra e chama onClosed", async () => {
      const { closer, purgeRepo } = build();
      const onClosed = jest.fn();

      closer.closeAfterCommit(buildInput(), onClosed);
      expect(purgeRepo.closeAndClaim).not.toHaveBeenCalled();

      await capturedHook()();

      expect(purgeRepo.closeAndClaim).toHaveBeenCalledTimes(1);
      expect(onClosed).toHaveBeenCalledWith({ contactRetained: false, purged: true });
    });

    it("o hook devolve a promise (awaited pelo runWithClaims)", () => {
      const { closer } = build();

      closer.closeAfterCommit(buildInput());

      expect(capturedHook()()).toBeInstanceOf(Promise);
    });

    it("resultado null => onClosed nao e chamado e o hook resolve", async () => {
      const { closer } = build(null);
      const onClosed = jest.fn();

      closer.closeAfterCommit(buildInput(), onClosed);
      await expect(capturedHook()()).resolves.toBeUndefined();

      expect(onClosed).not.toHaveBeenCalled();
    });

    it("erro de closeAndClaim nao relanca e o log nao traz mensagem do erro", async () => {
      const { closer, purgeRepo } = build();
      purgeRepo.closeAndClaim.mockRejectedValue(
        new Error("falha com joao@example.com"),
      );

      closer.closeAfterCommit(buildInput());
      await expect(capturedHook()()).resolves.toBeUndefined();

      expect(JSON.stringify(warn.mock.calls)).not.toContain("joao@example.com");
    });

    it("erro em onClosed nao relanca", async () => {
      const { closer } = build();

      closer.closeAfterCommit(buildInput(), () => {
        throw new Error("audit");
      });

      await expect(capturedHook()()).resolves.toBeUndefined();
    });
  });
});
