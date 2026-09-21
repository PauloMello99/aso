import { MarkChangelogSeenUseCase } from "./mark-changelog-seen.use-case";
import { IUserRepository } from "../../../user/domain/user.repository.interface";
import { UserEntity } from "../../../user/domain/user.entity";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";
import { ChangelogVersionInvalidException } from "../../domain/exceptions/changelog-version-invalid.exception";
import { getLatestVersion } from "../../domain/changelog-entries";

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
    updateChangelogSeenVersion: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
}

describe("MarkChangelogSeenUseCase", () => {
  const authUser = { id: "auth-1", email: "usuario@example.com", emailVerified: true };

  it("avança a versão vista quando é maior que a atual", async () => {
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser(1)),
    });
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await useCase.execute(authUser, 3);

    expect(userRepo.updateChangelogSeenVersion).toHaveBeenCalledWith(
      "auth-1",
      3,
    );
  });

  it("grava a versão quando o usuário nunca viu o changelog", async () => {
    const userRepo = buildFakeUserRepo();
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await useCase.execute(authUser, getLatestVersion());

    expect(userRepo.updateChangelogSeenVersion).toHaveBeenCalledWith(
      "auth-1",
      getLatestVersion(),
    );
  });

  it("é no-op quando a versão é menor ou igual à atual (não regride)", async () => {
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildUser(3)),
    });
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await useCase.execute(authUser, 1);
    await useCase.execute(authUser, 3);

    expect(userRepo.updateChangelogSeenVersion).not.toHaveBeenCalled();
  });

  it("aceita versão abaixo da última mesmo inexistente no registry", async () => {
    const userRepo = buildFakeUserRepo();
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await useCase.execute(authUser, 1);

    expect(userRepo.updateChangelogSeenVersion).toHaveBeenCalledWith(
      "auth-1",
      1,
    );
  });

  it("rejeita versão menor que 1", async () => {
    const userRepo = buildFakeUserRepo();
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await expect(useCase.execute(authUser, 0)).rejects.toBeInstanceOf(
      ChangelogVersionInvalidException,
    );
    expect(userRepo.updateChangelogSeenVersion).not.toHaveBeenCalled();
  });

  it("rejeita versão maior que a última do registry", async () => {
    const userRepo = buildFakeUserRepo();
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await expect(
      useCase.execute(authUser, getLatestVersion() + 1),
    ).rejects.toBeInstanceOf(ChangelogVersionInvalidException);
    expect(userRepo.updateChangelogSeenVersion).not.toHaveBeenCalled();
  });

  it("lança UserNotFoundException quando o usuário não existe", async () => {
    const userRepo = buildFakeUserRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const useCase = new MarkChangelogSeenUseCase(userRepo);

    await expect(useCase.execute(authUser, 1)).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});
