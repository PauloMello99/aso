import { GetChangelogUseCase } from "./get-changelog.use-case";
import { IUserRepository } from "../../../user/domain/user.repository.interface";
import { UserEntity } from "../../../user/domain/user.entity";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";
import {
  CHANGELOG_ENTRIES,
  getLatestVersion,
} from "../../domain/changelog-entries";

function buildUser(changelogSeenVersion: number | null): UserEntity {
  return UserEntity.create({
    id: "user-1",
    authId: "auth-1",
    platformRole: "user",
    name: "Usuário",
    email: "usuario@example.com",
    phone: null,
    avatarUrl: null,
    birthDate: null,
    gender: null,
    onboardingCompletedAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    changelogSeenVersion,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

function buildFakeUserRepo(
  overrides: Partial<jest.Mocked<IUserRepository>> = {},
): jest.Mocked<IUserRepository> {
  return {
    findByAuthId: jest.fn().mockResolvedValue(buildUser(null)),
    updateChangelogSeenVersion: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
}

describe("GetChangelogUseCase", () => {
  const authUser = { id: "auth-1", email: "usuario@example.com", emailVerified: true };

  it("retorna seenVersion null quando o usuário nunca viu o changelog", async () => {
    const useCase = new GetChangelogUseCase(buildFakeUserRepo());

    const result = await useCase.execute(authUser);

    expect(result.seenVersion).toBeNull();
    expect(result.entries).toBe(CHANGELOG_ENTRIES);
    expect(result.latestVersion).toBe(getLatestVersion());
  });

  it("retorna a versão já vista pelo usuário", async () => {
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser(2)),
    });
    const useCase = new GetChangelogUseCase(userRepo);

    const result = await useCase.execute(authUser);

    expect(result.seenVersion).toBe(2);
  });

  it("lança UserNotFoundException quando o usuário não existe", async () => {
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const useCase = new GetChangelogUseCase(userRepo);

    await expect(useCase.execute(authUser)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});
