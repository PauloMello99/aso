export const CHANGELOG_TARGET_REPOSITORY = Symbol(
  "CHANGELOG_TARGET_REPOSITORY",
);

export interface ChangelogOwnerTarget {
  userId: string;
  name: string;
  email: string;
}

export interface IChangelogTargetRepository {
  findOwnersToNotify(
    entryId: string,
    publishedAt: string,
    limit: number,
  ): Promise<ChangelogOwnerTarget[]>;
}
