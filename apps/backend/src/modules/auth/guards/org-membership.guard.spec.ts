import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { OrgMembershipGuard } from "./org-membership.guard";
import type { DrizzleDB } from "../../../database/database.module";
import type { AuthUser } from "../application/ports/auth-provider.interface";
import * as isSuperAdminModule from "../../../common/auth/is-super-admin";
import type { RequestWithActingContext } from "../../../common/request-context/acting-context";

function buildDb(rows: unknown[]): DrizzleDB {
  const queryBuilder = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  return {
    select: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as DrizzleDB;
}

function buildContext(
  request: Partial<Request & { user?: AuthUser }>,
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

const user: AuthUser = { id: "auth-1", email: "a@b.com", emailVerified: true };

describe("OrgMembershipGuard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("bloqueia quando não há usuário autenticado", async () => {
    const db = buildDb([]);
    const guard = new OrgMembershipGuard(db);
    const context = buildContext({ params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("bloqueia quando orgId está ausente nos params", async () => {
    const db = buildDb([]);
    const guard = new OrgMembershipGuard(db);
    const context = buildContext({ user, params: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("passa quando há membership real e a org não está suspensa, sem marcar actingAsSuperAdmin", async () => {
    const db = buildDb([
      { id: "membership-1", platformRole: "employee", suspendedAt: null },
    ]);
    const guard = new OrgMembershipGuard(db);
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBeUndefined();
  });

  it("bloqueia quando há membership real mas a org está suspensa e o usuário não é super_admin", async () => {
    const db = buildDb([
      {
        id: "membership-1",
        platformRole: "employee",
        suspendedAt: new Date("2026-01-01"),
      },
    ]);
    const guard = new OrgMembershipGuard(db);
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("passa quando há membership real, a org está suspensa mas o usuário é super_admin, sem marcar actingAsSuperAdmin", async () => {
    const db = buildDb([
      {
        id: "membership-1",
        platformRole: "super_admin",
        suspendedAt: new Date("2026-01-01"),
      },
    ]);
    const guard = new OrgMembershipGuard(db);
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBeUndefined();
  });

  it("bloqueia quando não há membership e isSuperAdmin (real) retorna false", async () => {
    const db = buildDb([]);
    const guard = new OrgMembershipGuard(db);
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("marca actingAsSuperAdmin e passa quando não há membership mas o usuário é super_admin", async () => {
    jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
    const db = buildDb([]);
    const guard = new OrgMembershipGuard(db);
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBe(true);
  });
});
