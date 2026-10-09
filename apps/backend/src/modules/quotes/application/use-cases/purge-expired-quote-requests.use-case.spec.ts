import { Logger } from "@nestjs/common";
import { PurgeExpiredQuoteRequestsUseCase } from "./purge-expired-quote-requests.use-case";
import {
  IQuoteRequestPurgeRepository,
  QuoteRequestPurgeClaim,
} from "../../domain/quote-request-purge.repository.interface";
import { QuoteRequestPurger } from "../quote-request-purger";
import {
  QUOTE_PURGE_BATCH_LIMIT,
  QUOTE_PURGE_LEASE_MS,
} from "../../domain/quote-request-lifecycle";

const NOW = new Date("2026-10-08T12:00:00Z");

function buildClaim(
  id: string,
  overrides: Partial<QuoteRequestPurgeClaim> = {},
): QuoteRequestPurgeClaim {
  return {
    id,
    orgId: "org-1",
    scope: "all",
    attempts: 1,
    claimedAt: NOW,
    ...overrides,
  };
}

function buildFakeRepo(
  claims: QuoteRequestPurgeClaim[],
): jest.Mocked<IQuoteRequestPurgeRepository> {
  return {
    claimDuePurges: jest.fn().mockResolvedValue(claims),
    recordPurgeFailure: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IQuoteRequestPurgeRepository>;
}

function buildFakePurger(
  impl: (claim: QuoteRequestPurgeClaim) => Promise<boolean> = () =>
    Promise.resolve(true),
): jest.Mocked<QuoteRequestPurger> {
  return {
    purge: jest.fn(impl),
  } as unknown as jest.Mocked<QuoteRequestPurger>;
}

describe("PurgeExpiredQuoteRequestsUseCase", () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    error = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("claim vazio: nada a fazer", async () => {
    const repo = buildFakeRepo([]);
    const purger = buildFakePurger();

    const result = await new PurgeExpiredQuoteRequestsUseCase(
      repo,
      purger,
    ).execute(NOW);

    expect(result).toEqual({
      claimed: 0,
      deleted: 0,
      imagesRemoved: 0,
      failed: 0,
    });
    expect(repo.claimDuePurges).toHaveBeenCalledWith(
      NOW,
      QUOTE_PURGE_LEASE_MS,
      QUOTE_PURGE_BATCH_LIMIT,
    );
    expect(purger.purge).not.toHaveBeenCalled();
  });

  it("conta deleted e imagesRemoved por escopo; claim perdido (false) nao conta", async () => {
    const claims = [
      buildClaim("r-1"),
      buildClaim("r-2", { scope: "images" }),
      buildClaim("r-3"),
    ];
    const repo = buildFakeRepo(claims);
    const purger = buildFakePurger((claim) =>
      Promise.resolve(claim.id !== "r-3"),
    );

    const result = await new PurgeExpiredQuoteRequestsUseCase(
      repo,
      purger,
    ).execute(NOW);

    expect(result).toEqual({
      claimed: 3,
      deleted: 1,
      imagesRemoved: 1,
      failed: 0,
    });
  });

  it("falha do 1o item e registrada e o 2o ainda e processado", async () => {
    const repo = buildFakeRepo([buildClaim("r-1"), buildClaim("r-2")]);
    const failure = new Error("segredo joao@example.com");
    failure.name = "StorageOperationFailedException";
    const purger = buildFakePurger((claim) =>
      claim.id === "r-1" ? Promise.reject(failure) : Promise.resolve(true),
    );

    const result = await new PurgeExpiredQuoteRequestsUseCase(
      repo,
      purger,
    ).execute(NOW);

    expect(result).toEqual({
      claimed: 2,
      deleted: 1,
      imagesRemoved: 0,
      failed: 1,
    });
    expect(repo.recordPurgeFailure).toHaveBeenCalledWith(
      "org-1",
      "r-1",
      "StorageOperationFailedException",
    );
    expect(purger.purge).toHaveBeenCalledTimes(2);
  });

  it("loga warn abaixo do limiar e error a partir de 8 tentativas, sem PII", async () => {
    const failure = new Error("joao@example.com +5511999998888");
    const repo = buildFakeRepo([
      buildClaim("r-1", { attempts: 7 }),
      buildClaim("r-2", { attempts: 8 }),
    ]);
    const purger = buildFakePurger(() => Promise.reject(failure));

    await new PurgeExpiredQuoteRequestsUseCase(repo, purger).execute(NOW);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    const logged = [...warn.mock.calls, ...error.mock.calls]
      .map((call: unknown[]) => String(call[0]))
      .join("\n");
    expect(logged).toContain("request=r-1");
    expect(logged).toContain("attempt=8");
    expect(logged).toContain("code=Error");
    expect(logged).not.toContain("joao");
    expect(logged).not.toContain("5511");
  });

  it("recordPurgeFailure lancando nao derruba o lote", async () => {
    const repo = buildFakeRepo([buildClaim("r-1"), buildClaim("r-2")]);
    repo.recordPurgeFailure.mockRejectedValue(new Error("db down"));
    const purger = buildFakePurger((claim) =>
      claim.id === "r-1" ? Promise.reject(new Error("x")) : Promise.resolve(true),
    );

    const result = await new PurgeExpiredQuoteRequestsUseCase(
      repo,
      purger,
    ).execute(NOW);

    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(1);
    expect(purger.purge).toHaveBeenCalledTimes(2);
  });

  it("erro do claim propaga", async () => {
    const repo = buildFakeRepo([]);
    repo.claimDuePurges.mockRejectedValue(new Error("claim failed"));

    await expect(
      new PurgeExpiredQuoteRequestsUseCase(repo, buildFakePurger()).execute(NOW),
    ).rejects.toThrow("claim failed");
  });
});
