import { randomBytes } from "crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";

/**
 * Generates a 20-character random lowercase alphabetic slug.
 * Matches the style used by Supabase (e.g. "wmnqustozicaluqgmvnr").
 * 26^20 ≈ 2×10^28 possible values — collision probability is negligible.
 */
function generateSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(20);
  return Array.from(bytes)
    .map((b) => alphabet[b % 26])
    .join("");
}

@Injectable()
export class CreateOrgUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(name: string, creatorAuthId: string): Promise<OrgEntity> {
    const slug = generateSlug();
    return this.orgRepo.create(name, slug, creatorAuthId);
  }
}
