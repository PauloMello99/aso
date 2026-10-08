import {
  DrizzleQuoteFormRepository,
  findUniqueViolationConstraint,
} from "./drizzle-quote-form.repository";
import { QuoteRequestPersistenceError } from "./quote-persistence.error";
import { QuoteFormSlugUnavailableException } from "../../domain/exceptions/quote-form-slug-unavailable.exception";
import type { DrizzleDB } from "../../../../database/database.module";

describe("findUniqueViolationConstraint", () => {
  it("reads constraint when code is at the root", () => {
    expect(
      findUniqueViolationConstraint({ code: "23505", constraint: "c1" }),
    ).toBe("c1");
  });

  it("reads constraint_name when code is at the root", () => {
    expect(
      findUniqueViolationConstraint({ code: "23505", constraint_name: "c2" }),
    ).toBe("c2");
  });

  it("finds the code inside cause (drizzle 0.45 wrapper)", () => {
    const wrapped = new Error("Failed query", {
      cause: { code: "23505", constraint: "quote_forms_slug_uq" },
    });
    expect(findUniqueViolationConstraint(wrapped)).toBe("quote_forms_slug_uq");
  });

  it("returns undefined for other errors", () => {
    expect(findUniqueViolationConstraint(new Error("x"))).toBeUndefined();
    expect(findUniqueViolationConstraint({ code: "23503" })).toBeUndefined();
    expect(findUniqueViolationConstraint(null)).toBeUndefined();
  });
});

function adminRejecting(error: unknown): DrizzleDB {
  const chain: Record<string, unknown> = {};
  const thenable = {
    then: (_ok: unknown, fail: (e: unknown) => unknown) =>
      Promise.reject(error).catch(fail),
  };
  for (const m of [
    "select",
    "from",
    "innerJoin",
    "where",
    "limit",
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
  ]) {
    chain[m] = () => ({ ...chain, ...thenable });
  }
  return chain as unknown as DrizzleDB;
}

describe("DrizzleQuoteFormRepository error handling", () => {
  const data = {
    orgId: "org-1",
    userId: "user-1",
    slug: "maria-secreta",
    displayName: "Maria Secreta",
    enabled: true,
  };

  it("maps the slug unique violation to QuoteFormSlugUnavailableException", async () => {
    const err = new Error("Failed query", {
      cause: { code: "23505", constraint: "quote_forms_slug_uq" },
    });
    const repo = new DrizzleQuoteFormRepository(
      adminRejecting(err),
      adminRejecting(err),
    );
    await expect(repo.upsertForMember(data)).rejects.toBeInstanceOf(
      QuoteFormSlugUnavailableException,
    );
  });

  it("sanitizes other upsert errors (no slug/displayName)", async () => {
    const err = new Error(
      `Failed query: insert ... params: ${data.slug},${data.displayName}`,
      { cause: { code: "08006" } },
    );
    const repo = new DrizzleQuoteFormRepository(
      adminRejecting(err),
      adminRejecting(err),
    );
    const thrown = await repo.upsertForMember(data).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(QuoteRequestPersistenceError);
    expect((thrown as Error).message).not.toContain("maria-secreta");
    expect((thrown as QuoteRequestPersistenceError).sqlState).toBe("08006");
  });

  it("sanitizes errors from findPublicBySlugAsAdmin", async () => {
    const err = new Error(`Failed query: select ... params: ${data.slug}`);
    const repo = new DrizzleQuoteFormRepository(
      adminRejecting(err),
      adminRejecting(err),
    );
    const thrown = await repo
      .findPublicBySlugAsAdmin(data.slug)
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(QuoteRequestPersistenceError);
    expect((thrown as Error).message).not.toContain("maria-secreta");
  });
});
