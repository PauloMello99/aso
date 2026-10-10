import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  MODULE_KEYS,
  hasModuleAccess,
  isModuleKey,
} from "./member-permissions";

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
    expect(isModuleKey("quotes")).toBe(true);
  });

  it("rejeita valores que não são módulos conhecidos", () => {
    expect(isModuleKey("invalid")).toBe(false);
  });
});

describe("modulo quotes", () => {
  it("faz parte de MODULE_KEYS (owner transferido recebe o modulo)", () => {
    expect(MODULE_KEYS).toContain("quotes");
  });

  it("e liberado por padrao ao funcionario convidado", () => {
    expect(DEFAULT_EMPLOYEE_PERMISSIONS).toContain("quotes");
    expect(
      hasModuleAccess("employee", DEFAULT_EMPLOYEE_PERMISSIONS, "quotes"),
    ).toBe(true);
  });

  it("funcionario sem a flag quotes nao tem acesso", () => {
    expect(hasModuleAccess("employee", ["services"], "quotes")).toBe(false);
  });
});
