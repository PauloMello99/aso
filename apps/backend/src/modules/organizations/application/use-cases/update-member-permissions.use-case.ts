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
import { MODULE_KEYS, isModuleKey } from "../../domain/member-permissions";

/**
 * Owner configura os módulos liberados a um **funcionário** (on/off). Owners não
 * usam permissões (acesso total) — atualizar as de um owner é no-op de efeito.
 */
@Injectable()
export class UpdateMemberPermissionsUseCase {
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
    permissions: string[],
  ): Promise<MemberEntity> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const member = await this.memberRepo.findByMemberId(memberId, orgId);
    if (!member) throw new MemberNotFoundException(memberId);

    // Normaliza: só chaves válidas e sem duplicatas; preserva a ordem canônica.
    const valid = MODULE_KEYS.filter(
      (m) => permissions.includes(m) && isModuleKey(m),
    );

    return this.memberRepo.updatePermissions(memberId, [...valid]);
  }
}
