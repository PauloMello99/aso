import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GrantCompUseCase } from "../application/use-cases/grant-comp.use-case";
import { RevokeCompUseCase } from "../application/use-cases/revoke-comp.use-case";
import { ApplyDiscountUseCase } from "../application/use-cases/apply-discount.use-case";
import { RemoveDiscountUseCase } from "../application/use-cases/remove-discount.use-case";
import { ListSubscriptionInvoicesUseCase } from "../application/use-cases/list-subscription-invoices.use-case";
import { GetSubscriptionUseCase } from "../application/use-cases/get-subscription.use-case";
import { GrantCompDto } from "./dto/grant-comp.dto";
import { ApplyDiscountDto } from "./dto/apply-discount.dto";

@Controller("admin/orgs/:orgId/subscription")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminSubscriptionController {
  constructor(
    private readonly grantComp: GrantCompUseCase,
    private readonly revokeComp: RevokeCompUseCase,
    private readonly applyDiscount: ApplyDiscountUseCase,
    private readonly removeDiscount: RemoveDiscountUseCase,
    private readonly listInvoices: ListSubscriptionInvoicesUseCase,
    private readonly getSubscription: GetSubscriptionUseCase,
  ) {}

  @Get()
  get(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.getSubscription.execute(orgId);
  }

  @Post("comp")
  comp(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: GrantCompDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.grantComp.execute(
      orgId,
      dto.reason,
      user.id,
      dto.expiresAt ? new Date(dto.expiresAt) : null,
    );
  }

  @Delete("comp")
  revokeCompHandler(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.revokeComp.execute(orgId, user.id);
  }

  @Post("discount")
  discount(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applyDiscount.execute(
      orgId,
      { percentOff: dto.percentOff, durationMonths: dto.durationMonths },
      user.id,
    );
  }

  @Delete("discount")
  removeDiscountHandler(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.removeDiscount.execute(orgId, user.id);
  }

  @Get("invoices")
  invoices(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listInvoices.execute(orgId);
  }
}
