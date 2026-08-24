import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import { OrgOwnerGuard } from "./org-owner.guard";
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

describe("OrgOwnerGuard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("bloqueia quando não há usuário autenticado", async () => {
    const db = buildDb([]);
    const guard = new OrgOwnerGuard(db);
    const context = buildContext({ params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("bloqueia quando orgId está ausente nos params", async () => {
    const db = buildDb([]);
    const guard = new OrgOwnerGuard(db);
    const context = buildContext({ user, params: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("passa quando há membership de owner real, sem marcar actingAsSuperAdmin", async () => {
    const db = buildDb([{ id: "membership-1" }]);
    const guard = new OrgOwnerGuard(db);
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBeUndefined();
  });

  it("bloqueia quando não há membership de owner e isSuperAdmin (real) retorna false", async () => {
    const db = buildDb([]);
    const guard = new OrgOwnerGuard(db);
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("marca actingAsSuperAdmin e passa quando não há membership de owner mas o usuário é super_admin", async () => {
    jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
    const db = buildDb([]);
    const guard = new OrgOwnerGuard(db);
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBe(true);
  });
});
