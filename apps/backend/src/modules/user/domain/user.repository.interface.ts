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
   * Avança changelog_seen_version do usuário; nunca regride (GREATEST atômico,
   * seguro em corrida entre abas/dispositivos).
   * É a ÚNICA via de escrita de users.changelog_seen_version: o campo NUNCA deve
   * entrar em UpdateUserData, pois a RLS autoriza a linha inteira e o clamp
   * (registry + GREATEST) é aplicacional.
   * Intencionalmente NÃO toca updatedAt: dispensar o banner não é edição de perfil.
   */
  updateChangelogSeenVersion(authId: string, version: number): Promise<void>;
  /**
   * Usuários com platform_role = 'super_admin' (destinatários dos alertas
   * internos de SLA de suporte). Cross-tenant por natureza, sempre via
   * DRIZZLE_ADMIN.
   */
  findPlatformAdminEmails(): Promise<PlatformAdminContact[]>;
}
