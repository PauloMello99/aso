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
    mergeOnboardingSeen: jest.fn().mockResolvedValue(undefined),
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

  it("onboardingSeen sozinho: faz merge, sem update e sem audit, e devolve o usuário relido", async () => {
    const reloaded = buildUser({ name: "Relido" });
    const { useCase, userRepo, auditService } = buildUseCase({
      userRepo: buildFakeUserRepo({
        findByAuthId: jest
          .fn()
          .mockResolvedValueOnce(buildUser())
          .mockResolvedValueOnce(reloaded),
      }),
    });

    const result = await useCase.execute(authUser, {
      onboardingSeen: { caixa: 1 },
    });

    expect(userRepo.mergeOnboardingSeen).toHaveBeenCalledWith(authUser.id, {
      caixa: 1,
    });
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(result).toBe(reloaded);
  });

  it("onboardingSeen vazio sozinho: sem merge, sem update e sem audit", async () => {
    const { useCase, userRepo, auditService } = buildUseCase();

    await useCase.execute(authUser, { onboardingSeen: {} });

    expect(userRepo.mergeOnboardingSeen).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("onboardingSeen null (defensivo): não lança TypeError, sem merge, sem update e sem audit", async () => {
    const { useCase, userRepo, auditService } = buildUseCase();

    await expect(
      useCase.execute(authUser, {
        onboardingSeen: null as unknown as Record<string, number>,
      }),
    ).resolves.toBeDefined();

    expect(userRepo.mergeOnboardingSeen).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("onboardingSeen vazio com outro campo: update normal, sem merge", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, { name: "Novo", onboardingSeen: {} });

    expect(userRepo.mergeOnboardingSeen).not.toHaveBeenCalled();
    expect(userRepo.update).toHaveBeenCalledTimes(1);
  });

  it("faz MERGE de onboardingSeen via repo (nunca pelo update de perfil)", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, {
      name: "Novo Nome",
      onboardingSeen: { caixa: 1 },
    });

    expect(userRepo.mergeOnboardingSeen).toHaveBeenCalledWith(authUser.id, {
      caixa: 1,
    });
    const call = userRepo.update.mock.calls[0]![1] as Record<string, unknown>;
    expect(call).not.toHaveProperty("onboardingSeen");
  });

  it("não chama o merge quando onboardingSeen é omitido", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, { name: "Novo Nome" });

    expect(userRepo.mergeOnboardingSeen).not.toHaveBeenCalled();
  });

  it("onboardingSeen não altera onboardingCompletedAt", async () => {
    const { useCase, userRepo } = buildUseCase();

    await useCase.execute(authUser, {
      name: "Novo Nome",
      onboardingSeen: { caixa: 1 },
    });

    expect(userRepo.update).toHaveBeenCalledWith(
      authUser.id,
      expect.objectContaining({ onboardingCompletedAt: undefined }),
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

  describe("productUpdatesOptedOut", () => {
    it("true: deriva a data no servidor (new Date()) e faz update + audit (campo de perfil)", async () => {
      const { useCase, userRepo, auditService } = buildUseCase();
      const before = Date.now();

      await useCase.execute(authUser, { productUpdatesOptedOut: true });

      const call = userRepo.update.mock.calls[0]![1] as {
        productUpdatesOptedOutAt?: Date | null;
      };
      expect(call.productUpdatesOptedOutAt).toBeInstanceOf(Date);
      expect(call.productUpdatesOptedOutAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(call.productUpdatesOptedOutAt!.getTime()).toBeLessThanOrEqual(Date.now());
      expect(userRepo.mergeOnboardingSeen).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { fields: ["productUpdatesOptedOut"] },
        }),
      );
    });

    it("false: repassa null (limpa a data)", async () => {
      const { useCase, userRepo } = buildUseCase();

      await useCase.execute(authUser, { productUpdatesOptedOut: false });

      expect(userRepo.update).toHaveBeenCalledWith(
        authUser.id,
        expect.objectContaining({ productUpdatesOptedOutAt: null }),
      );
    });

    it("true quando já optado: não regrava a data (mantém a existente)", async () => {
      const optedAt = new Date("2026-03-01T00:00:00Z");
      const { useCase, userRepo } = buildUseCase({
        userRepo: buildFakeUserRepo({
          findByAuthId: jest
            .fn()
            .mockResolvedValue(buildUser({ productUpdatesOptedOutAt: optedAt })),
        }),
      });

      await useCase.execute(authUser, { productUpdatesOptedOut: true });

      const call = userRepo.update.mock.calls[0]![1] as {
        productUpdatesOptedOutAt?: Date | null;
      };
      expect(call.productUpdatesOptedOutAt).toBe(optedAt);
    });

    it("omitido: não repassa productUpdatesOptedOutAt", async () => {
      const { useCase, userRepo } = buildUseCase();

      await useCase.execute(authUser, { name: "Novo Nome" });

      expect(userRepo.update).toHaveBeenCalledWith(
        authUser.id,
        expect.objectContaining({ productUpdatesOptedOutAt: undefined }),
      );
    });

    it("junto com outros campos e onboardingSeen: um único update, merge separado, ambos no audit", async () => {
      const { useCase, userRepo, auditService } = buildUseCase();

      await useCase.execute(authUser, {
        name: "Novo Nome",
        productUpdatesOptedOut: true,
        onboardingSeen: { caixa: 1 },
      });

      expect(userRepo.mergeOnboardingSeen).toHaveBeenCalledTimes(1);
      expect(userRepo.update).toHaveBeenCalledTimes(1);
      expect(userRepo.update).toHaveBeenCalledWith(
        authUser.id,
        expect.objectContaining({
          name: "Novo Nome",
          productUpdatesOptedOutAt: expect.any(Date),
        }),
      );
      const audit = auditService.log.mock.calls[0]![0] as {
        metadata: { fields: string[] };
      };
      expect(audit.metadata.fields).toEqual(
        expect.arrayContaining(["name", "productUpdatesOptedOut"]),
      );
    });
  });
});
