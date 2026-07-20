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
import { IUserRepository } from "../../domain/user.repository.interface";
import { UserMapper } from "./user.mapper";

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
      .values({ authId: data.authId, name: data.name, email: data.email })
      .onConflictDoNothing()
      .returning();
    return UserMapper.toDomain(row!);
  }

  async delete(authId: string): Promise<void> {
    await this.admin.delete(schema.users).where(eq(schema.users.authId, authId));
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
        updatedAt: new Date(),
      })
      .where(eq(schema.users.authId, authId))
      .returning();
    return UserMapper.toDomain(row!);
  }
}
