import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { SendAnamnesisInviteUseCase } from "../application/use-cases/send-anamnesis-invite.use-case";
import { SendAnamnesisInviteDto } from "./dto/send-anamnesis-invite.dto";

@Controller("orgs/:orgId/anamnesis-responses")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("services")
export class AnamnesisResponsesController {
  constructor(
    private readonly sendInvite: SendAnamnesisInviteUseCase,
  ) {}

  @Post()
  @UseGuards(ActiveSubscriptionGuard)
  async send(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendAnamnesisInviteDto,
  ) {
    return this.sendInvite.execute({
      orgId,
      authId: user.id,
      customerId: dto.customerId,
      serviceTypeId: dto.serviceTypeId,
    });
  }
}
