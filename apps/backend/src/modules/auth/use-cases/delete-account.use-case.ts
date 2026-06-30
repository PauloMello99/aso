import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../application/ports/auth-provider.interface";
import {
  AUTH_PROVIDER,
  IAuthProvider,
} from "../application/ports/auth-provider.interface";
import {
  USER_REPOSITORY,
  IUserRepository,
} from "../../user/domain/user.repository.interface";
import {
  MEMBER_REPOSITORY,
  IMemberRepository,
} from "../../organizations/domain/member.repository.interface";
import { AuditService } from "../../audit/audit.service";
import { UserNotFoundException } from "../../user/domain/exceptions/user-not-found.exception";
import { OwnsOrganizationException } from "../../user/domain/exceptions/owns-organization.exception";

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(MEMBER_REPOSITORY) private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(authUser: AuthUser): Promise<void> {
    const user = await this.userRepo.findByAuthId(authUser.id);
    if (!user) throw new UserNotFoundException(authUser.id);

    // Regra ACC-1: não pode haver org da qual o usuário ainda é proprietário.
    const owned = await this.memberRepo.countOwnedOrgs(user.id);
    if (owned > 0) throw new OwnsOrganizationException();

    // Remove vínculos de funcionário em outras orgs, o registro do usuário e a
    // identidade no provedor de auth (dados pessoais). Ordem: dados → identidade.
    await this.memberRepo.removeAllByUserId(user.id);
    await this.userRepo.delete(authUser.id);
    await this.authProvider.deleteUser(authUser.id);

    await this.auditService.log({
      actorId: user.id,
      action: "delete",
      entityType: "user",
      entityId: user.id,
      metadata: { email: user.email },
    });
  }
}
