import {
  isActingAsSuperAdmin,
  markActingAsSuperAdmin,
  runWithActingContext,
} from "./acting-context";

describe("acting-context", () => {
  it("marks the current context as acting-as-super-admin when called inside runWithActingContext", async () => {
    await runWithActingContext(false, async () => {
      expect(isActingAsSuperAdmin()).toBe(false);
      markActingAsSuperAdmin();
      expect(isActingAsSuperAdmin()).toBe(true);
    });
  });

  it("starts as true when seeded with true, without needing to mark it", async () => {
    await runWithActingContext(true, async () => {
      expect(isActingAsSuperAdmin()).toBe(true);
    });
  });

  it("is a silent no-op outside any runWithActingContext, and reads as false", () => {
    expect(() => markActingAsSuperAdmin()).not.toThrow();
    expect(isActingAsSuperAdmin()).toBe(false);
  });

  it("does not leak the flag between concurrent contexts", async () => {
    const markedRun = runWithActingContext(false, async () => {
      markActingAsSuperAdmin();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isActingAsSuperAdmin()).toBe(true);
    });

    const unmarkedRun = runWithActingContext(false, async () => {
      expect(isActingAsSuperAdmin()).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isActingAsSuperAdmin()).toBe(false);
    });

    await Promise.all([markedRun, unmarkedRun]);
  });
});
