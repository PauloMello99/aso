import { DrizzleMemberRepository } from "./drizzle-member.repository";
import type { DrizzleDB } from "../../../../database/database.module";
import * as isSuperAdminModule from "../../../../common/auth/is-super-admin";
import {
  runWithActingContext,
  isActingAsSuperAdmin,
} from "../../../../common/request-context/acting-context";

// Fake de DrizzleDB que resolve `.limit()` em sequência (um item da fila por
// chamada), pra simular múltiplas queries encadeadas na mesma conexão (ex.:
// query de membership seguida da query de síntese via admin). Segue o padrão
// de fake de DrizzleDB já usado em org-owner.guard.spec.ts/org-membership.guard.spec.ts.
function buildDb(responses: unknown[][]): DrizzleDB {
  const limit = jest.fn();
  responses.forEach((rows) => limit.mockResolvedValueOnce(rows));
  const queryBuilder = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit,
  };
  return {
    select: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as DrizzleDB;
}

const memberRow = {
  memberId: "member-1",
  orgId: "org-1",
  userId: "user-1",
  role: "employee",
  enabled: true,
  permissions: [],
  userName: "Fulano",
  userEmail: "fulano@example.com",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
};

const userRow = {
  id: "user-1",
  name: "Fulano",
  email: "fulano@example.com",
};

describe("DrizzleMemberRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findByAuthId", () => {
    it("com membership real, retorna o membro sem consultar isSuperAdmin e sem marcar o contexto acting", async () => {
      const isSuperAdminSpy = jest.spyOn(isSuperAdminModule, "isSuperAdmin");
      const db = buildDb([[memberRow]]);
      const admin = buildDb([]);
      const repo = new DrizzleMemberRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findByAuthId("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.memberId).toBe("member-1");
      expect(result?.role).toBe("employee");
      expect(isSuperAdminSpy).not.toHaveBeenCalled();
      expect(capturedActing).toBe(false);
    });

    it("sem membership e com isSuperAdmin=true, sintetiza o membro como owner e marca o contexto acting", async () => {
      jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
      const db = buildDb([[]]);
      const admin = buildDb([[userRow]]);
      const repo = new DrizzleMemberRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findByAuthId("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.userId).toBe("user-1");
      expect(result?.role).toBe("owner");
      expect(capturedActing).toBe(true);
    });

    it("sem membership e com isSuperAdmin=false, retorna null e não marca o contexto acting", async () => {
      jest
        .spyOn(isSuperAdminModule, "isSuperAdmin")
        .mockResolvedValueOnce(false);
      const db = buildDb([[]]);
      const admin = buildDb([]);
      const repo = new DrizzleMemberRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findByAuthId("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result).toBeNull();
      expect(capturedActing).toBe(false);
    });
  });
});
