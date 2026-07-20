import type { User as UserRow } from "../../../../database/schema/users";
import { UserEntity } from "../../domain/user.entity";

export class UserMapper {
  static toDomain(row: UserRow): UserEntity {
    return UserEntity.create({
      id: row.id,
      authId: row.authId,
      platformRole: row.platformRole,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      avatarUrl: row.avatarUrl ?? null,
      birthDate: row.birthDate ?? null,
      gender: row.gender ?? null,
      onboardingCompletedAt: row.onboardingCompletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(
    entity: Pick<UserEntity, "authId" | "name" | "email">,
  ): { authId: string; name: string; email: string } {
    return {
      authId: entity.authId,
      name: entity.name,
      email: entity.email,
    };
  }
}
