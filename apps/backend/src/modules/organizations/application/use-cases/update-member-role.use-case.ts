import { Inject, Injectable } from "@nestjs/common";
import type { OrgRole } from "../../domain/org.entity";
import type { MemberEntity } from "../../domain/member.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";

@Injectable()
export class UpdateMemberRoleUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    memberId: string,
    authId: string,
    role: OrgRole,
  ): Promise<MemberEntity> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, orgId);
    if (!member) throw new MemberNotFoundException(memberId);

    const updated = await this.memberRepo.updateRole(memberId, role);

    await this.auditService.logByAuthId(authId, {
      orgId,
      action: "update",
      entityType: "org_membership",
      entityId: memberId,
      metadata: { memberId, role },
    });

    return updated;
  }
}
