import {
  compareSemver,
  parseSemver,
  shouldNotifyOwners,
} from "./changelog-semver";

describe("parseSemver", () => {
  it("converte versão válida", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it.each(["", "1.2", "1.2.3.4", "v1.2.3", "1.2.x", "1.2.3-beta", " 1.2.3"])(
    "retorna null para %p",
    (value) => {
      expect(parseSemver(value)).toBeNull();
    },
  );
});

describe("compareSemver", () => {
  it("compara major, minor e patch em ordem", () => {
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.2.0", "1.10.0")).toBe(-1);
    expect(compareSemver("1.0.2", "1.0.1")).toBe(1);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });

  it("retorna null se inválido", () => {
    expect(compareSemver("x", "1.0.0")).toBeNull();
    expect(compareSemver("1.0.0", "x")).toBeNull();
  });
});

describe("shouldNotifyOwners", () => {
  it("notifica em MINOR maior no mesmo MAJOR", () => {
    expect(shouldNotifyOwners("1.1.0", "1.0.0")).toBe(true);
  });

  it("notifica em MAJOR maior, mesmo com MINOR menor", () => {
    expect(shouldNotifyOwners("2.0.0", "1.5.0")).toBe(true);
    expect(shouldNotifyOwners("2.0.0", "1.0.0")).toBe(true);
  });

  it("não notifica em patch", () => {
    expect(shouldNotifyOwners("1.0.1", "1.0.0")).toBe(false);
  });

  it("não notifica se igual", () => {
    expect(shouldNotifyOwners("1.1.0", "1.1.0")).toBe(false);
  });

  it("não notifica em regressão", () => {
    expect(shouldNotifyOwners("1.0.0", "1.1.0")).toBe(false);
    expect(shouldNotifyOwners("1.9.0", "2.0.0")).toBe(false);
  });

  it("não notifica com parse inválido", () => {
    expect(shouldNotifyOwners("abc", "1.0.0")).toBe(false);
    expect(shouldNotifyOwners("1.1.0", "abc")).toBe(false);
  });

  it("não notifica sem versão anterior", () => {
    expect(shouldNotifyOwners("1.1.0", null)).toBe(false);
  });
});
