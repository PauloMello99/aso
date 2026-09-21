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
   * Faz MERGE de `seen` em users.onboarding_seen via SQL (`||` atômico); nunca
   * substitui o mapa (abas/dispositivos concorrentes não se sobrescrevem). Chaves
   * novas sobrescrevem só a mesma chave. Forma/tamanho validados na borda (DTO).
   * Como changelog_seen_version, NÃO entra em UpdateUserData e este método em si
   * NÃO toca updatedAt. Já o caller UpdateMeUseCase só executa `update` (que
   * atualiza updatedAt) e o audit log quando há campo de perfil no mesmo input;
   * um input só com onboardingSeen faz apenas o merge e devolve o usuário relido.
   * Não há teto de tamanho aqui: o limite é o CHECK users_onboarding_seen_bounded
   * (4096 B; violação vira erro do PG, não DomainException).
   */
  mergeOnboardingSeen(
    authId: string,
    seen: Record<string, number>,
  ): Promise<void>;
  /**
   * Usuários com platform_role = 'super_admin' (destinatários dos alertas
   * internos de SLA de suporte). Cross-tenant por natureza, sempre via
   * DRIZZLE_ADMIN.
   */
  findPlatformAdminEmails(): Promise<PlatformAdminContact[]>;
}
