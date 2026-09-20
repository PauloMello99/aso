import { UserEntity } from "../../user/domain/user.entity";
import { toMeResponse } from "./me-response";

function buildUser(productUpdatesOptedOutAt?: Date | null): UserEntity {
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
    productUpdatesOptedOutAt,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

describe("toMeResponse", () => {
  it("expõe productUpdatesOptedOut=false quando a data é null (default)", () => {
    expect(toMeResponse(buildUser()).productUpdatesOptedOut).toBe(false);
  });

  it("expõe productUpdatesOptedOut=true quando há data, sem vazar o timestamp", () => {
    const result = toMeResponse(buildUser(new Date("2026-05-01T00:00:00Z")));

    expect(result.productUpdatesOptedOut).toBe(true);
    expect(result).not.toHaveProperty("productUpdatesOptedOutAt");
  });

  it("formato do POST /auth/me/avatar: usuário com avatar novo sai no mesmo contrato do /me", () => {
    const user = buildUser(new Date("2026-05-01T00:00:00Z"));
    const withAvatar = UserEntity.create({
      ...user,
      avatarUrl: "https://cdn.example.com/avatar.png",
    });

    const result = toMeResponse(withAvatar);

    expect(result.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(result.productUpdatesOptedOut).toBe(true);
    expect(result).not.toHaveProperty("productUpdatesOptedOutAt");
  });

  it("preserva os demais campos do usuário", () => {
    const result = toMeResponse(buildUser());

    expect(result).toMatchObject({
      id: "user-1",
      email: "usuario@example.com",
      onboardingSeen: {},
    });
  });
});
