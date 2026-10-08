import { DrizzleQuoteRequestRepository } from "./drizzle-quote-request.repository";
import { QuoteRequestPersistenceError } from "./quote-persistence.error";
import { CreateQuoteRequestData } from "../../domain/quote-request.repository.interface";
import type { DrizzleDB } from "../../../../database/database.module";

const request: CreateQuoteRequestData = {
  id: "11111111-1111-1111-1111-111111111111",
  orgId: "org-1",
  targetUserId: "user-1",
  requesterName: "Joao Cliente",
  requesterPhone: "+5511999998888",
  requesterEmail: "joao@example.com",
  idea: "Um leao no antebraco",
  consentVersion: "v1",
  consentTextSnapshot: "texto",
  privacyConsentAcceptedAt: new Date("2026-10-01T00:00:00Z"),
  contactRetentionConsentAcceptedAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  expiresAt: new Date("2026-10-31T00:00:00Z"),
};

// Simula DrizzleQueryError: message com sql + params e o erro do driver em cause.
function buildDrizzleLikeError(): Error {
  const driver = Object.assign(new Error("duplicate key value"), {
    code: "23505",
  });
  return new Error(
    `Failed query: insert into "quote_requests" values ($1,$2,$3,$4) params: ${request.requesterName},${request.requesterPhone},${request.requesterEmail},${request.idea}`,
    { cause: driver },
  );
}

describe("DrizzleQuoteRequestRepository", () => {
  it("rethrows a sanitized error without PII, sql, params or cause", async () => {
    const admin = {
      transaction: jest.fn().mockRejectedValue(buildDrizzleLikeError()),
    } as unknown as DrizzleDB;
    const repo = new DrizzleQuoteRequestRepository(admin);

    const error = await repo
      .createWithImagesAsAdmin(request, [])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuoteRequestPersistenceError);
    const sanitized = error as QuoteRequestPersistenceError;
    expect(sanitized.sqlState).toBe("23505");
    expect(sanitized.cause).toBeUndefined();
    const exposed = `${sanitized.message}\n${sanitized.stack ?? ""}`;
    for (const secret of [
      "Joao",
      "joao@example.com",
      "5511999998888",
      "leao",
      "Failed query",
      "params",
    ]) {
      expect(exposed).not.toContain(secret);
    }
  });

  it("keeps sqlState undefined when no SQLSTATE is found", async () => {
    const admin = {
      transaction: jest.fn().mockRejectedValue(new Error("boom")),
    } as unknown as DrizzleDB;
    const error = await new DrizzleQuoteRequestRepository(admin)
      .createWithImagesAsAdmin(request, [])
      .catch((e: unknown) => e);
    expect((error as QuoteRequestPersistenceError).sqlState).toBeUndefined();
  });
});
