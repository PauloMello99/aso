import { DrizzleCalendarEventRepository } from "./drizzle-calendar-event.repository";
import { CalendarEventSourceConflictException } from "../../domain/exceptions/calendar-event-source-conflict.exception";
import type { CreateCalendarEventData } from "../../domain/calendar-event.entity";
import type { DrizzleDB } from "../../../../database/database.module";

jest.mock("../../../../database/database.module", () => ({
  DRIZZLE: Symbol("DRIZZLE"),
  DRIZZLE_ADMIN: Symbol("DRIZZLE_ADMIN"),
}));

const SOURCE_UQ = "calendar_events_source_quote_request_uq";

function buildData(): CreateCalendarEventData {
  return {
    orgId: "org-1",
    assignedTo: "user-1",
    type: "appointment",
    title: "Orçamento: Ana",
    startsAt: new Date("2099-10-20T17:00:00.000Z"),
    endsAt: new Date("2099-10-20T18:00:00.000Z"),
    sourceQuoteRequestId: "quote-1",
  };
}

function buildRepo(insertResult: () => Promise<unknown>) {
  const values = jest.fn(() => ({ returning: jest.fn(insertResult) }));
  const db = { insert: jest.fn(() => ({ values })) } as unknown as DrizzleDB;
  return { values, repo: new DrizzleCalendarEventRepository(db, db) };
}

describe("DrizzleCalendarEventRepository.create", () => {
  it("23505 da unique de origem (erro direto) vira CalendarEventSourceConflictException", async () => {
    const { repo } = buildRepo(() =>
      Promise.reject(
        Object.assign(new Error("dup"), { code: "23505", constraint: SOURCE_UQ }),
      ),
    );

    await expect(repo.create(buildData())).rejects.toBeInstanceOf(
      CalendarEventSourceConflictException,
    );
  });

  it("o mesmo erro dentro de cause tambem", async () => {
    const driver = Object.assign(new Error("dup"), {
      code: "23505",
      constraint: SOURCE_UQ,
    });
    const { repo } = buildRepo(() =>
      Promise.reject(new Error("Failed query", { cause: driver })),
    );

    await expect(repo.create(buildData())).rejects.toBeInstanceOf(
      CalendarEventSourceConflictException,
    );
  });

  it("23505 de OUTRA constraint e relancado como o erro original", async () => {
    const original = Object.assign(new Error("dup"), {
      code: "23505",
      constraint: "calendar_events_confirmation_token_hash_uq",
    });
    const { repo } = buildRepo(() => Promise.reject(original));

    await expect(repo.create(buildData())).rejects.toBe(original);
  });

  it("erro que nao e 23505 e relancado como o original", async () => {
    const original = Object.assign(new Error("deadlock"), { code: "40P01" });
    const { repo } = buildRepo(() => Promise.reject(original));

    await expect(repo.create(buildData())).rejects.toBe(original);
  });

  it("sourceQuoteRequestId chega ao values() do insert", async () => {
    const { repo, values } = buildRepo(() =>
      Promise.reject(new Error("para aqui")),
    );

    await repo.create(buildData()).catch(() => undefined);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ sourceQuoteRequestId: "quote-1" }),
    );
  });
});
