import type { DrizzleDB } from "../../../../database/database.module";
import { OnboardingSeenTooLargeException } from "../../domain/exceptions/onboarding-seen-too-large.exception";
import { DrizzleUserRepository } from "./user.repository";

function buildFailingUpdateDb(error: unknown): DrizzleDB {
  const where = jest.fn().mockRejectedValue(error);
  const set = jest.fn().mockReturnValue({ where });
  return { update: jest.fn().mockReturnValue({ set }) } as unknown as DrizzleDB;
}

function buildRepo(error: unknown): DrizzleUserRepository {
  return new DrizzleUserRepository(
    buildFailingUpdateDb(error),
    {} as unknown as DrizzleDB,
  );
}

describe("DrizzleUserRepository.mergeOnboardingSeen", () => {
  const pgError = {
    code: "23514",
    constraint: "users_onboarding_seen_bounded",
  };

  it("mapeia 23514 do CHECK users_onboarding_seen_bounded (direto ou em cause) para OnboardingSeenTooLargeException", async () => {
    await expect(
      buildRepo(pgError).mergeOnboardingSeen("auth-1", { tour: 1 }),
    ).rejects.toBeInstanceOf(OnboardingSeenTooLargeException);

    await expect(
      buildRepo(
        Object.assign(new Error("query failed"), { cause: pgError }),
      ).mergeOnboardingSeen("auth-1", { tour: 1 }),
    ).rejects.toBeInstanceOf(OnboardingSeenTooLargeException);
  });

  it("NÃO mascara outros erros: 23514 de outra constraint e erros genéricos propagam", async () => {
    const otherCheck = { code: "23514", constraint: "outro_check" };
    await expect(
      buildRepo(otherCheck).mergeOnboardingSeen("auth-1", { tour: 1 }),
    ).rejects.toBe(otherCheck);

    const boom = new Error("boom");
    await expect(
      buildRepo(boom).mergeOnboardingSeen("auth-1", { tour: 1 }),
    ).rejects.toBe(boom);
  });
});
