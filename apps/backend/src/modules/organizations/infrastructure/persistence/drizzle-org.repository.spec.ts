import { DrizzleOrgRepository } from "./drizzle-org.repository";
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

const orgRow = {
  id: "org-1",
  name: "Estúdio X",
  slug: "estudio-x",
  logoUrl: null,
  role: "employee",
  permissions: [],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const ownerMembershipRow = { role: "owner" };

const orgRowAsOwner = {
  id: "org-1",
  name: "Estúdio X",
  slug: "estudio-x",
  logoUrl: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("DrizzleOrgRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findByIdAndAuthId", () => {
    it("com membership real, retorna a org sem consultar isSuperAdmin e sem marcar o contexto acting", async () => {
      const isSuperAdminSpy = jest.spyOn(isSuperAdminModule, "isSuperAdmin");
      const db = buildDb([[orgRow]]);
      const admin = buildDb([]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findByIdAndAuthId("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.id).toBe("org-1");
      expect(isSuperAdminSpy).not.toHaveBeenCalled();
      expect(capturedActing).toBe(false);
    });

    it("sem membership e com isSuperAdmin=true, sintetiza a org como owner e marca o contexto acting", async () => {
      jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
      const db = buildDb([[]]);
      const admin = buildDb([[orgRowAsOwner]]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findByIdAndAuthId("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.id).toBe("org-1");
      expect(result?.role).toBe("owner");
      expect(capturedActing).toBe(true);
    });
  });

  describe("findBySlugAndAuthId", () => {
    it("com membership real, retorna a org sem consultar isSuperAdmin e sem marcar o contexto acting", async () => {
      const isSuperAdminSpy = jest.spyOn(isSuperAdminModule, "isSuperAdmin");
      const db = buildDb([[orgRow]]);
      const admin = buildDb([]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findBySlugAndAuthId("estudio-x", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.slug).toBe("estudio-x");
      expect(isSuperAdminSpy).not.toHaveBeenCalled();
      expect(capturedActing).toBe(false);
    });

    it("sem membership e com isSuperAdmin=true, sintetiza a org como owner e marca o contexto acting", async () => {
      jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
      const db = buildDb([[]]);
      const admin = buildDb([[orgRowAsOwner]]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.findBySlugAndAuthId("estudio-x", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result?.slug).toBe("estudio-x");
      expect(result?.role).toBe("owner");
      expect(capturedActing).toBe(true);
    });
  });

  describe("isOwner", () => {
    it("com membership de owner real, retorna true sem consultar isSuperAdmin e sem marcar o contexto acting", async () => {
      const isSuperAdminSpy = jest.spyOn(isSuperAdminModule, "isSuperAdmin");
      const db = buildDb([[ownerMembershipRow]]);
      const admin = buildDb([]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.isOwner("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result).toBe(true);
      expect(isSuperAdminSpy).not.toHaveBeenCalled();
      expect(capturedActing).toBe(false);
    });

    it("sem membership de owner e com isSuperAdmin=true, retorna true e marca o contexto acting", async () => {
      jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
      const db = buildDb([[]]);
      const admin = buildDb([]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.isOwner("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result).toBe(true);
      expect(capturedActing).toBe(true);
    });

    it("sem membership de owner e com isSuperAdmin=false, retorna false e não marca o contexto acting", async () => {
      jest
        .spyOn(isSuperAdminModule, "isSuperAdmin")
        .mockResolvedValueOnce(false);
      const db = buildDb([[]]);
      const admin = buildDb([]);
      const repo = new DrizzleOrgRepository(db, admin);

      let capturedActing: boolean | undefined;
      const result = await runWithActingContext(false, async () => {
        const r = await repo.isOwner("org-1", "auth-1");
        capturedActing = isActingAsSuperAdmin();
        return r;
      });

      expect(result).toBe(false);
      expect(capturedActing).toBe(false);
    });
  });
});
