import { UserEntity } from "../../user/domain/user.entity";

export type MeResponse = Omit<UserEntity, "productUpdatesOptedOutAt"> & {
  productUpdatesOptedOut: boolean;
};

// Expõe só o boolean derivado; o timestamp do opt-out nunca sai na resposta.
export function toMeResponse(user: UserEntity): MeResponse {
  const { productUpdatesOptedOutAt, ...rest } = user;
  return { ...rest, productUpdatesOptedOut: productUpdatesOptedOutAt !== null };
}
