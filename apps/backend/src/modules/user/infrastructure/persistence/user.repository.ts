import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateUserData,
  UpdateUserData,
  UserEntity,
} from "../../domain/user.entity";
import {
  IUserRepository,
  PlatformAdminContact,
} from "../../domain/user.repository.interface";
import { OnboardingSeenTooLargeException } from "../../domain/exceptions/onboarding-seen-too-large.exception";
import { UserMapper } from "./user.mapper";

const ONBOARDING_SEEN_BOUND_CHECK = "users_onboarding_seen_bounded";

// O driver pode entregar o erro do pg direto ou embrulhado em `cause`
// (DrizzleQueryError). Só o CHECK de tamanho de onboarding_seen é mapeado.
function isOnboardingSeenBoundViolation(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (typeof error === "object" && error !== null && "cause" in error) {
    candidates.push((error as { cause?: unknown }).cause);
  }
  return candidates.some((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    const { code, constraint } = candidate as {
      code?: unknown;
      constraint?: unknown;
    };
    return code === "23514" && constraint === ONBOARDING_SEEN_BOUND_CHECK;
  });
}

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findByAuthId(authId: string): Promise<UserEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.authId, authId))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const [row] = await this.admin
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${email})`)
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const [row] = await this.admin
      .insert(schema.users)
      .values({
        authId: data.authId,
        name: data.name,
        email: data.email,
        termsAcceptedAt: data.termsAcceptedAt,
        termsVersion: data.termsVersion,
      })
      .onConflictDoNothing()
      .returning();
    return UserMapper.toDomain(row!);
  }

  async findPlatformAdminEmails(): Promise<PlatformAdminContact[]> {
    const rows = await this.admin
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.platformRole, "super_admin"));
    return rows;
  }

  async delete(authId: string): Promise<void> {
    await this.admin.delete(schema.users).where(eq(schema.users.authId, authId));
  }

  async updateChangelogSeenVersion(
    authId: string,
    version: number,
  ): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        changelogSeenVersion: sql`GREATEST(COALESCE(${schema.users.changelogSeenVersion}, 0), ${version})`,
      })
      .where(eq(schema.users.authId, authId));
  }

  async mergeOnboardingSeen(
    authId: string,
    seen: Record<string, number>,
  ): Promise<void> {
    try {
      await this.db
        .update(schema.users)
        .set({
          onboardingSeen: sql`coalesce(${schema.users.onboardingSeen}, '{}'::jsonb) || ${JSON.stringify(seen)}::jsonb`,
        })
        .where(eq(schema.users.authId, authId));
    } catch (error) {
      if (isOnboardingSeenBoundViolation(error)) {
        throw new OnboardingSeenTooLargeException();
      }
      throw error;
    }
  }

  async update(authId: string, data: UpdateUserData): Promise<UserEntity> {
    const [row] = await this.db
      .update(schema.users)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.onboardingCompletedAt !== undefined && {
          onboardingCompletedAt: data.onboardingCompletedAt,
        }),
        ...(data.productUpdatesOptedOutAt !== undefined && {
          productUpdatesOptedOutAt: data.productUpdatesOptedOutAt,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.authId, authId))
      .returning();
    return UserMapper.toDomain(row!);
  }
}
