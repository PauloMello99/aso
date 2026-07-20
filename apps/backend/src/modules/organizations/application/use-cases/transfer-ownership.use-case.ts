import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import { AuditService } from "../../../audit/audit.service";
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
    private readonly auditService: AuditService,
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

    let currentOwnerMemberId = currentOwner.memberId;
    if (currentOwnerMemberId === "") {
      const members = await this.memberRepo.findAllByOrg(orgId);
      currentOwnerMemberId =
        members.find((m) => m.role === "owner" && m.enabled)?.memberId ?? "";
    }

    if (currentOwnerMemberId === newOwnerMemberId) return;

    const newOwner = await this.memberRepo.findByMemberId(
      newOwnerMemberId,
      orgId,
    );
    if (!newOwner) throw new MemberNotFoundException(newOwnerMemberId);
    if (!newOwner.enabled) throw new MemberInactiveException();

    await this.memberRepo.transferOwnership(
      orgId,
      newOwnerMemberId,
      currentOwnerMemberId,
      [...MODULE_KEYS],
    );

    await this.auditService.logByAuthId(authId, {
      orgId,
      action: "update",
      entityType: "organization",
      entityId: orgId,
      metadata: {
        from: currentOwnerMemberId,
        to: newOwnerMemberId,
        operation: "transfer_ownership",
      },
    });
  }
}
