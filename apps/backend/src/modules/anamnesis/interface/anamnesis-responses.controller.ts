import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { ListLinkableAnamnesisResponsesUseCase } from "../application/use-cases/list-linkable-anamnesis-responses.use-case";
import { ListAnamnesisResponsesUseCase } from "../application/use-cases/list-anamnesis-responses.use-case";
import { GetAnamnesisResponseDetailUseCase } from "../application/use-cases/get-anamnesis-response-detail.use-case";
import { SendAnamnesisInviteDto } from "./dto/send-anamnesis-invite.dto";
import type { AnamnesisResponseStatus } from "../domain/anamnesis-response.entity";

@Controller("orgs/:orgId/anamnesis-responses")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("services")
export class AnamnesisResponsesController {
  constructor(
    private readonly sendInvite: SendAnamnesisInviteUseCase,
    private readonly listLinkable: ListLinkableAnamnesisResponsesUseCase,
    private readonly listResponses: ListAnamnesisResponsesUseCase,
    private readonly getDetail: GetAnamnesisResponseDetailUseCase,
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

  @Get("linkable")
  async linkable(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("customerId", ParseUUIDPipe) customerId: string,
    @Query("serviceTypeId", ParseUUIDPipe) serviceTypeId: string,
  ) {
    return this.listLinkable.execute({ orgId, customerId, serviceTypeId });
  }

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("customerId", new ParseUUIDPipe({ optional: true }))
    customerId?: string,
    @Query("serviceTypeId", new ParseUUIDPipe({ optional: true }))
    serviceTypeId?: string,
    @Query("status") status?: string,
  ) {
    const validStatus: AnamnesisResponseStatus[] = ["pending", "submitted"];
    return this.listResponses.execute({
      orgId,
      customerId,
      serviceTypeId,
      status: validStatus.includes(status as AnamnesisResponseStatus)
        ? (status as AnamnesisResponseStatus)
        : undefined,
    });
  }

  @Get(":id")
  async detail(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.getDetail.execute({ id, orgId });
  }
}
