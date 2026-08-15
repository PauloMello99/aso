import { CreateUserData, UpdateUserData, UserEntity } from "./user.entity";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface PlatformAdminContact {
  id: string;
  name: string;
  email: string;
}

export interface IUserRepository {
  findByAuthId(authId: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(authId: string, data: UpdateUserData): Promise<UserEntity>;
  delete(authId: string): Promise<void>;
  /**
   * Usuários com platform_role = 'super_admin' (destinatários dos alertas
   * internos de SLA de suporte). Cross-tenant por natureza, sempre via
   * DRIZZLE_ADMIN.
   */
  findPlatformAdminEmails(): Promise<PlatformAdminContact[]>;
}
