import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import { MODULE_KEYS } from "../../domain/member-permissions";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";
import { MemberInactiveException } from "../../domain/exceptions/member-inactive.exception";

@Injectable()
export class TransferOwnershipUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    orgId: string,
    newOwnerMemberId: string,
    authId: string,
  ): Promise<void> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const currentOwner = await this.memberRepo.findByAuthId(orgId, authId);
    if (!currentOwner) throw new OrgForbiddenException();

    // Transferir para si mesmo é no-op.
    if (currentOwner.memberId === newOwnerMemberId) return;

    const newOwner = await this.memberRepo.findByMemberId(
      newOwnerMemberId,
      orgId,
    );
    if (!newOwner) throw new MemberNotFoundException(newOwnerMemberId);
    if (!newOwner.enabled) throw new MemberInactiveException();

    // O antigo dono vira funcionário com acesso total (não perde os módulos).
    await this.memberRepo.transferOwnership(
      orgId,
      newOwnerMemberId,
      currentOwner.memberId,
      [...MODULE_KEYS],
    );
  }
}
