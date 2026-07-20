import { UpdateMeUseCase } from "./update-me.use-case";
import { IUserRepository } from "../../user/domain/user.repository.interface";
import { UserEntity } from "../../user/domain/user.entity";
import { IAuthProvider } from "../application/ports/auth-provider.interface";
import { AuditService } from "../../audit/audit.service";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";

function buildUser(
  overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {},
): UserEntity {
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
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeUserRepo(
  overrides: Partial<jest.Mocked<IUserRepository>> = {},
): jest.Mocked<IUserRepository> {
  return {
    findByAuthId: jest.fn().mockResolvedValue(buildUser()),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(buildUser()),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IUserRepository>;
}

function buildFakeAuthProvider(
  overrides: Partial<jest.Mocked<IAuthProvider>> = {},
): jest.Mocked<IAuthProvider> {
  return {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    refreshToken: jest.fn(),
    generatePasswordResetLink: jest.fn(),
    resetPassword: jest.fn(),
    verifyToken: jest.fn(),
    updateEmail: jest.fn(),
    deleteUser: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IAuthProvider>;
}

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

interface Fakes {
  userRepo: jest.Mocked<IUserRepository>;
  authProvider: jest.Mocked<IAuthProvider>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    userRepo: buildFakeUserRepo(),
    authProvider: buildFakeAuthProvider(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };
  const useCase = new UpdateMeUseCase(
    fakes.userRepo,
    fakes.authProvider,
    fakes.auditService,
  );
  return { useCase, ...fakes };
}

const authUser = { id: "auth-1", email: "usuario@example.com", emailVerified: true };

describe("UpdateMeUseCase", () => {
  it("lança UserNotFoundException quando o usuário não existe", async () => {
    const { useCase } = buildUseCase({
      userRepo: buildFakeUserRepo({ findByAuthId: jest.fn().mockResolvedValue(null) }),
    });

    await expect(useCase.execute(authUser, {})).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });

  it("ignora o timestamp do cliente e deriva onboardingCompletedAt no servidor (new Date())", async () => {
    const { useCase, userRepo } = buildUseCase();
    const before = Date.now();

    await useCase.execute(authUser, {
      onboardingCompletedAt: "2000-01-01T00:00:00.000Z",
    });

    const call = userRepo.update.mock.calls[0]![1] as {
      onboardingCompletedAt?: Date | null;
    };
    expect(call.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(call.onboardingCompletedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(call.onboardingCompletedAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("repassa null quando onboardingCompletedAt é explicitamente null", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, { onboardingCompletedAt: null });

    expect(userRepo.update).toHaveBeenCalledWith(
      authUser.id,
      expect.objectContaining({ onboardingCompletedAt: null }),
    );
  });

  it("não repassa onboardingCompletedAt quando omitido do input", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, { name: "Novo Nome" });

    expect(userRepo.update).toHaveBeenCalledWith(
      authUser.id,
      expect.objectContaining({ onboardingCompletedAt: undefined }),
    );
  });

  it("inclui onboardingCompletedAt em changedFields no audit log quando o campo é enviado", async () => {
    const { useCase, auditService } = buildUseCase();

    await useCase.execute(authUser, { onboardingCompletedAt: "2026-07-17T12:00:00.000Z" });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { fields: expect.arrayContaining(["onboardingCompletedAt"]) },
      }),
    );
  });

  it("não inclui onboardingCompletedAt em changedFields quando o campo é omitido", async () => {
    const { useCase, auditService } = buildUseCase();

    await useCase.execute(authUser, { name: "Novo Nome" });

    const call = auditService.log.mock.calls[0]![0] as {
      metadata: { fields: string[] };
    };
    expect(call.metadata.fields).not.toContain("onboardingCompletedAt");
  });
});
