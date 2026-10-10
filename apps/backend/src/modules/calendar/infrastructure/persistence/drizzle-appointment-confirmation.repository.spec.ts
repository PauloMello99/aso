import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../../../database/database.module";
import { DrizzleAppointmentConfirmationRepository } from "./drizzle-appointment-confirmation.repository";

const dialect = new PgDialect();

// Renderiza a condição WHERE capturada (SQL em minúsculas + params; Date vira
// ISO, como o driver recebe). Valida o SQL gerado sem precisar de banco.
function render(condition: SQL | undefined): { sql: string; params: unknown[] } {
  if (!condition) throw new Error("where não foi chamado");
  const query = dialect.sqlToQuery(condition);
  return { sql: query.sql.toLowerCase(), params: query.params };
}

function iso(value: Date): string {
  return value.toISOString();
}

interface Fake {
  db: DrizzleDB;
  chain: {
    from: jest.Mock;
    innerJoin: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    set: jest.Mock;
    returning: jest.Mock;
  };
  captured: { where?: SQL };
}

// Fake encadeado de select/update. `where` guarda a condição; `limit` e
// `returning` resolvem com `result`.
function buildFakeDb(result: unknown[]): Fake {
  const captured: { where?: SQL } = {};
  const chain = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn().mockResolvedValue(result),
    set: jest.fn(),
    returning: jest.fn().mockResolvedValue(result),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.where.mockImplementation((condition: SQL) => {
    captured.where = condition;
    return chain;
  });
  const db = {
    select: jest.fn().mockReturnValue(chain),
    update: jest.fn().mockReturnValue(chain),
  } as unknown as DrizzleDB;
  return { db, chain, captured };
}

function buildEventRow() {
  return {
    id: "ev-1",
    orgId: "org-1",
    assignedTo: "user-1",
    customerId: null,
    createdBy: "user-1",
    type: "appointment" as const,
    status: "scheduled" as const,
    reminderSentAt: null,
    title: "Tattoo",
    description: null,
    startsAt: new Date("2026-10-20T17:00:00.000Z"),
    endsAt: new Date("2026-10-20T19:00:00.000Z"),
    allDay: false,
    visibility: "private" as const,
    customerEmail: "ana@example.com",
    confirmationStatus: "pending" as const,
    confirmationTokenHash: "segredo-hash",
    confirmationRequestedAt: new Date("2026-10-01T12:00:00.000Z"),
    confirmationSentAt: null,
    confirmationRespondedAt: null,
    customerReminderSentAt: null,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
  };
}

const NOW = new Date("2026-10-19T12:00:00.000Z");
const UNTIL = new Date("2026-10-20T12:00:00.000Z");

describe("DrizzleAppointmentConfirmationRepository", () => {
  describe("findDueCustomerReminders", () => {
    it("filtra pendentes agendados com e-mail, sem lembrete, na janela e com 24h entre pedido e início", async () => {
      const { db, chain, captured } = buildFakeDb([
        { event: buildEventRow(), orgName: "Studio Helena" },
      ]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      const result = await repo.findDueCustomerReminders(NOW, UNTIL, 200);

      const { sql, params } = render(captured.where);
      expect(sql).toContain('"confirmation_status" =');
      expect(sql).toContain('"status" =');
      expect(sql).toContain('"customer_email" is not null');
      expect(sql).toContain('"customer_reminder_sent_at" is null');
      expect(sql).toContain('"starts_at" >');
      expect(sql).toContain('"starts_at" <=');
      expect(sql).toMatch(
        /"confirmation_requested_at" <= .*"starts_at" - interval '24 hours'/,
      );
      expect(params).toEqual(
        expect.arrayContaining(["pending", "scheduled", iso(NOW), iso(UNTIL)]),
      );
      expect(chain.limit).toHaveBeenCalledWith(200);
      expect(chain.orderBy).toHaveBeenCalledTimes(1);
      expect(chain.innerJoin).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]?.requestedAt).toEqual(
        new Date("2026-10-01T12:00:00.000Z"),
      );
      expect(result[0]?.orgName).toBe("Studio Helena");
      expect(result[0]?.event.id).toBe("ev-1");
    });
  });

  describe("claimCustomerReminder", () => {
    const REQUESTED_AT = new Date("2026-10-01T12:00:00.000Z");

    it("reserva presa ao snapshot do ciclo: SQL e params completos, em ordem", async () => {
      const { db, chain, captured } = buildFakeDb([{ id: "ev-1" }]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.claimCustomerReminder("ev-1", NOW, UNTIL, REQUESTED_AT),
      ).resolves.toBe(true);

      const { sql, params } = render(captured.where);
      expect(sql).toBe(
        '("calendar_events"."id" = $1' +
          ' and "calendar_events"."customer_reminder_sent_at" is null' +
          ' and "calendar_events"."confirmation_status" = $2' +
          ' and "calendar_events"."status" = $3' +
          ' and "calendar_events"."starts_at" > $4' +
          ' and "calendar_events"."starts_at" <= $5' +
          ' and "calendar_events"."confirmation_requested_at" = $6' +
          ` and "calendar_events"."confirmation_requested_at" <= "calendar_events"."starts_at" - interval '24 hours')`,
      );
      expect(params).toEqual([
        "ev-1",
        "pending",
        "scheduled",
        iso(NOW),
        iso(UNTIL),
        iso(REQUESTED_AT),
      ]);
      expect(chain.set).toHaveBeenCalledWith({ customerReminderSentAt: NOW });
    });

    it("retorna false quando nenhuma linha foi reservada (ex.: ciclo mudou)", async () => {
      const { db } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.claimCustomerReminder("ev-1", NOW, UNTIL, REQUESTED_AT),
      ).resolves.toBe(false);
    });
  });

  describe("storeReminderToken (compare-and-swap)", () => {
    it("só grava se a reserva ainda é a nossa e o ciclo segue pendente", async () => {
      const sentAt = new Date("2026-10-19T12:00:05.000Z");
      const { db, chain, captured } = buildFakeDb([{ id: "ev-1" }]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.storeReminderToken("ev-1", "hash-novo", NOW, sentAt),
      ).resolves.toBe(true);

      const { sql, params } = render(captured.where);
      expect(sql).toBe(
        '("calendar_events"."id" = $1' +
          ' and "calendar_events"."confirmation_status" = $2' +
          ' and "calendar_events"."status" = $3' +
          ' and "calendar_events"."customer_reminder_sent_at" = $4)',
      );
      expect(params).toEqual(["ev-1", "pending", "scheduled", iso(NOW)]);
      expect(chain.set).toHaveBeenCalledWith({
        confirmationTokenHash: "hash-novo",
        confirmationSentAt: sentAt,
      });
    });

    it("retorna false quando o CAS não casa nenhuma linha", async () => {
      const { db } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.storeReminderToken("ev-1", "hash-novo", NOW, NOW),
      ).resolves.toBe(false);
    });
  });

  describe("releaseCustomerReminder", () => {
    it("zera o carimbo só se ainda for o da reserva", async () => {
      const { db, chain, captured } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await repo.releaseCustomerReminder("ev-1", NOW);

      const { sql, params } = render(captured.where);
      expect(sql).toContain('"id" =');
      expect(sql).toContain('"customer_reminder_sent_at" =');
      expect(params).toEqual(expect.arrayContaining(["ev-1", iso(NOW)]));
      expect(chain.set).toHaveBeenCalledWith({ customerReminderSentAt: null });
    });
  });

  describe("markConfirmationSentByHash", () => {
    it("carimba confirmation_sent_at só quando o hash vigente é o do token enviado", async () => {
      const { db, chain, captured } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await repo.markConfirmationSentByHash("ev-1", "hash-1", NOW);

      const { sql, params } = render(captured.where);
      expect(sql).toContain('"id" =');
      expect(sql).toContain('"confirmation_token_hash" =');
      expect(params).toEqual(expect.arrayContaining(["ev-1", "hash-1"]));
      expect(chain.set).toHaveBeenCalledWith({ confirmationSentAt: NOW });
    });
  });

  describe("findByTokenHash", () => {
    it("busca pelo hash, devolve org e evento sem expor o hash", async () => {
      const { db, chain, captured } = buildFakeDb([
        { event: buildEventRow(), orgName: "Studio Helena" },
      ]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      const view = await repo.findByTokenHash("hash-1");

      const { sql, params } = render(captured.where);
      expect(sql).toContain('"confirmation_token_hash" =');
      expect(params).toEqual(["hash-1"]);
      expect(chain.limit).toHaveBeenCalledWith(1);
      expect(view?.orgName).toBe("Studio Helena");
      expect(JSON.stringify(view)).not.toContain("segredo-hash");
      expect(view).not.toHaveProperty("customerName");
    });

    it("retorna null quando o hash não existe", async () => {
      const { db } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(repo.findByTokenHash("nada")).resolves.toBeNull();
    });
  });

  describe("recordResponse", () => {
    it("exige hash vigente, evento agendado, futuro e resposta diferente da atual", async () => {
      const { db, chain, captured } = buildFakeDb([{ id: "ev-1" }]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.recordResponse("ev-1", "hash-1", "confirmed", NOW),
      ).resolves.toBe(true);

      const { sql, params } = render(captured.where);
      expect(sql).toContain('"id" =');
      expect(sql).toContain('"confirmation_token_hash" =');
      expect(sql).toContain('"status" =');
      expect(sql).toContain('"starts_at" >');
      expect(sql).toContain("is distinct from");
      expect(params).toEqual(
        expect.arrayContaining(["ev-1", "hash-1", "scheduled", iso(NOW), "confirmed"]),
      );
      expect(chain.set).toHaveBeenCalledWith({
        confirmationStatus: "confirmed",
        confirmationRespondedAt: NOW,
      });
    });

    it("retorna false quando nenhuma linha casa (hash trocado, cancelado, começou ou mesma resposta)", async () => {
      const { db } = buildFakeDb([]);
      const repo = new DrizzleAppointmentConfirmationRepository(db);

      await expect(
        repo.recordResponse("ev-1", "hash-1", "canceled_by_customer", NOW),
      ).resolves.toBe(false);
    });
  });
});
