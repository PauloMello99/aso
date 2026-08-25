import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { OrgModuleGuard } from "./org-module.guard";
import {
  ALLOW_ANY_ORG_MEMBER,
  REQUIRE_MODULE_KEY,
} from "../decorators/require-module.decorator";
import type { DrizzleDB } from "../../../database/database.module";
import type { AuthUser } from "../application/ports/auth-provider.interface";
import { CustomersController } from "../../customers/interface/customers.controller";
import { MaterialsController } from "../../materials/interface/materials.controller";
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

function buildReflector(required: unknown): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
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

describe("OrgModuleGuard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("bloqueia funcionário sem a flag do módulo quando a classe exige o módulo", async () => {
    const db = buildDb([{ role: "employee", permissions: [] }]);
    const guard = new OrgModuleGuard(db, buildReflector("clients"));
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("permite funcionário sem a flag quando o handler usa @AllowAnyOrgMember", async () => {
    const db = buildDb([{ role: "employee", permissions: [] }]);
    const guard = new OrgModuleGuard(db, buildReflector(ALLOW_ANY_ORG_MEMBER));
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("owner sempre passa, mesmo sem a flag do módulo", async () => {
    const db = buildDb([{ role: "owner", permissions: [] }]);
    const guard = new OrgModuleGuard(db, buildReflector("clients"));
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("funcionário com a flag do módulo passa", async () => {
    const db = buildDb([{ role: "employee", permissions: ["clients"] }]);
    const guard = new OrgModuleGuard(db, buildReflector("clients"));
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("bloqueia com @AllowAnyOrgMember quando não há membership na org (nem super_admin)", async () => {
    const db = buildDb([]);
    const guard = new OrgModuleGuard(db, buildReflector(ALLOW_ANY_ORG_MEMBER));
    const context = buildContext({ user, params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("bloqueia com @AllowAnyOrgMember quando não há usuário autenticado", async () => {
    const db = buildDb([]);
    const guard = new OrgModuleGuard(db, buildReflector(ALLOW_ANY_ORG_MEMBER));
    const context = buildContext({ params: { orgId: "org-1" } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("marca actingAsSuperAdmin e passa quando não há membership mas o usuário é super_admin", async () => {
    jest.spyOn(isSuperAdminModule, "isSuperAdmin").mockResolvedValueOnce(true);
    const db = buildDb([]);
    const guard = new OrgModuleGuard(db, buildReflector("clients"));
    const request: Partial<RequestWithActingContext & { user?: AuthUser }> = {
      user,
      params: { orgId: "org-1" },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actingAsSuperAdmin).toBe(true);
  });
});

describe("@AllowAnyOrgMember() aplicado nos handlers de seleção (B1)", () => {
  it("grava o sentinel no handler, sobrepondo o @RequireModule da classe", () => {
    expect(
      Reflect.getMetadata(REQUIRE_MODULE_KEY, CustomersController.prototype.list),
    ).toBe(ALLOW_ANY_ORG_MEMBER);
    expect(
      Reflect.getMetadata(
        REQUIRE_MODULE_KEY,
        CustomersController.prototype.origins,
      ),
    ).toBe(ALLOW_ANY_ORG_MEMBER);
    expect(
      Reflect.getMetadata(REQUIRE_MODULE_KEY, MaterialsController.prototype.list),
    ).toBe(ALLOW_ANY_ORG_MEMBER);
    expect(Reflect.getMetadata(REQUIRE_MODULE_KEY, CustomersController)).toBe(
      "clients",
    );
    expect(Reflect.getMetadata(REQUIRE_MODULE_KEY, MaterialsController)).toBe(
      "stock",
    );
  });
});
