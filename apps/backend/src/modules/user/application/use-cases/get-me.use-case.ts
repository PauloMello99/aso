import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import { UserEntity } from "../../domain/user.entity";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/user.repository.interface";

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(authUser: AuthUser): Promise<UserEntity> {
    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);
    return user;
  }
}
