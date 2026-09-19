import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";
import {
  CHANGELOG_ENTRIES,
  getLatestVersion,
} from "../../domain/changelog-entries";
import { ChangelogEntry } from "../../domain/changelog-entry";

export interface GetChangelogResult {
  entries: readonly ChangelogEntry[];
  seenVersion: number | null;
  latestVersion: number;
}

@Injectable()
export class GetChangelogUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(authUser: AuthUser): Promise<GetChangelogResult> {
    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);
    return {
      entries: CHANGELOG_ENTRIES,
      seenVersion: user.changelogSeenVersion ?? null,
      latestVersion: getLatestVersion(),
    };
  }
}
