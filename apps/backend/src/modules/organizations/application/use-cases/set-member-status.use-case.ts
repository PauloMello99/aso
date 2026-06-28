import { Inject, Injectable } from "@nestjs/common";
import type { MemberEntity } from "../../domain/member.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";
import { LastActiveOwnerException } from "../../domain/exceptions/last-active-owner.exception";

@Injectable()
export class SetMemberStatusUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    orgId: string,
    memberId: string,
    authId: string,
    enabled: boolean,
  ): Promise<MemberEntity> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, orgId);
    if (!member) throw new MemberNotFoundException(memberId);

    if (member.enabled === enabled) return member;

    // Não deixar a org sem nenhum owner ativo.
    if (!enabled && member.role === "owner") {
      const activeOwners = await this.memberRepo.countActiveOwners(orgId);
      if (activeOwners <= 1) throw new LastActiveOwnerException();
    }

    return this.memberRepo.setEnabled(memberId, enabled);
  }
}
