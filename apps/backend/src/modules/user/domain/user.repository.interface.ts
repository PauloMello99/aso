import { CreateUserData, UpdateUserData, UserEntity } from "./user.entity";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface IUserRepository {
  findByAuthId(authId: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  /** Busca por e-mail (case-insensitive). Bypassa RLS. */
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(authId: string, data: UpdateUserData): Promise<UserEntity>;
}
