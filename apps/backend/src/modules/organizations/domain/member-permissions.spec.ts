import { hasModuleAccess, isModuleKey } from "./member-permissions";

describe("hasModuleAccess", () => {
  it("owner sempre tem acesso, mesmo sem a permissão na lista", () => {
    expect(hasModuleAccess("owner", [], "clients")).toBe(true);
  });

  it("funcionário sem a flag do módulo não tem acesso", () => {
    expect(hasModuleAccess("employee", ["services"], "clients")).toBe(false);
  });

  it("funcionário com a flag do módulo tem acesso", () => {
    expect(
      hasModuleAccess("employee", ["services", "clients"], "clients"),
    ).toBe(true);
  });
});

describe("isModuleKey", () => {
  it("aceita as chaves válidas de módulo", () => {
    expect(isModuleKey("clients")).toBe(true);
    expect(isModuleKey("stock")).toBe(true);
  });

  it("rejeita valores que não são módulos conhecidos", () => {
    expect(isModuleKey("invalid")).toBe(false);
  });
});
