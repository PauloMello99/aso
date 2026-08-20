import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { SendCustomerSelfRegistrationInviteUseCase } from "../application/use-cases/send-customer-self-registration-invite.use-case";
import { SendCustomerUpdateInviteUseCase } from "../application/use-cases/send-customer-update-invite.use-case";
import { SendCustomerSelfRegistrationInviteDto } from "./dto/send-customer-self-registration-invite.dto";

@Controller("orgs/:orgId")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("clients")
export class CustomerSelfServiceController {
  constructor(
    private readonly sendSelfRegistrationInvite: SendCustomerSelfRegistrationInviteUseCase,
    private readonly sendUpdateInvite: SendCustomerUpdateInviteUseCase,
  ) {}

  @Post("registration-invites")
  @UseGuards(ActiveSubscriptionGuard)
  async createRegistrationInvite(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: SendCustomerSelfRegistrationInviteDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Não devolve `registration`/`fillUrl` verbatim: ambos carregam o token do
    // convite, que só deve chegar ao destinatário por e-mail.
    const result = await this.sendSelfRegistrationInvite.execute({
      orgId,
      authId: user.id,
      email: dto.email,
      serviceTypeId: dto.serviceTypeId,
    });
    return { id: result.registration.id, sent: true };
  }

  @Post("customers/:customerId/update-invites")
  @UseGuards(ActiveSubscriptionGuard)
  async createUpdateInvite(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Mesmo raciocínio: `invitation`/`fillUrl` carregam o token, não expor aqui.
    const result = await this.sendUpdateInvite.execute({
      orgId,
      authId: user.id,
      customerId,
    });
    return { id: result.invitation.id, sent: true };
  }
}
