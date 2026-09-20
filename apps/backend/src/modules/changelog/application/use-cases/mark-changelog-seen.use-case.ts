import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";
import { getLatestVersion } from "../../domain/changelog-entries";
import { ChangelogVersionInvalidException } from "../../domain/exceptions/changelog-version-invalid.exception";

@Injectable()
export class MarkChangelogSeenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(authUser: AuthUser, version: number): Promise<void> {
    if (version < 1 || version > getLatestVersion()) {
      throw new ChangelogVersionInvalidException(version);
    }

    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);

    if ((user.changelogSeenVersion ?? 0) >= version) return;

    // GREATEST no repositório garante que uma corrida não regride a versão.
    await this.userRepo.updateChangelogSeenVersion(authUser.id, version);
  }
}
