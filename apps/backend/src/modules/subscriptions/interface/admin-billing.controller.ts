import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListBillingPlansUseCase } from "../application/use-cases/list-billing-plans.use-case";
import { UpdateBillingPlanProductUseCase } from "../application/use-cases/update-billing-plan-product.use-case";
import { RotatePlanIntervalPriceUseCase } from "../application/use-cases/rotate-plan-interval-price.use-case";
import { UpsertPlanIntervalPriceUseCase } from "../application/use-cases/upsert-plan-interval-price.use-case";
import { SetPlanIntervalActiveUseCase } from "../application/use-cases/set-plan-interval-active.use-case";
import { CreateBillingCouponUseCase } from "../application/use-cases/create-billing-coupon.use-case";
import { ListBillingCouponsUseCase } from "../application/use-cases/list-billing-coupons.use-case";
import { UpdateBillingCouponUseCase } from "../application/use-cases/update-billing-coupon.use-case";
import type { BillingInterval } from "../domain/subscription.entity";
import { UpdateBillingPlanProductDto } from "./dto/update-billing-plan-product.dto";
import { RotatePlanIntervalPriceDto } from "./dto/rotate-plan-interval-price.dto";
import { UpsertPlanIntervalPriceDto } from "./dto/upsert-plan-interval-price.dto";
import { SetPlanIntervalActiveDto } from "./dto/set-plan-interval-active.dto";
import { CreateBillingCouponDto } from "./dto/create-billing-coupon.dto";
import { UpdateBillingCouponDto } from "./dto/update-billing-coupon.dto";
import { ListBillingCouponsQueryDto } from "./dto/list-billing-coupons-query.dto";

const BILLING_INTERVALS = ["monthly", "semiannual", "annual"] as const;

@Controller("admin/billing")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminBillingController {
  constructor(
    private readonly listBillingPlans: ListBillingPlansUseCase,
    private readonly updateBillingPlanProduct: UpdateBillingPlanProductUseCase,
    private readonly rotatePlanIntervalPrice: RotatePlanIntervalPriceUseCase,
    private readonly upsertPlanIntervalPrice: UpsertPlanIntervalPriceUseCase,
    private readonly setPlanIntervalActive: SetPlanIntervalActiveUseCase,
    private readonly createBillingCoupon: CreateBillingCouponUseCase,
    private readonly listBillingCoupons: ListBillingCouponsUseCase,
    private readonly updateBillingCoupon: UpdateBillingCouponUseCase,
  ) {}

  @Get("plans")
  list() {
    return this.listBillingPlans.execute();
  }

  @Patch("plans/:key/product")
  updateProduct(
    @Param("key") key: string,
    @Body() dto: UpdateBillingPlanProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateBillingPlanProduct.execute(key, dto, user.id);
  }

  @Post("plans/:key/prices/:interval")
  rotateIntervalPrice(
    @Param("key") key: string,
    @Param("interval", new ParseEnumPipe(BILLING_INTERVALS))
    interval: BillingInterval,
    @Body() dto: RotatePlanIntervalPriceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rotatePlanIntervalPrice.execute(
      key,
      interval,
      { amountCents: dto.amountCents, currency: dto.currency },
      user.id,
    );
  }

  @Post("plans/:key/prices")
  upsertIntervalPrice(
    @Param("key") key: string,
    @Body() dto: UpsertPlanIntervalPriceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.upsertPlanIntervalPrice.execute(
      key,
      dto.interval,
      { amountCents: dto.amountCents, currency: dto.currency },
      user.id,
    );
  }

  @Patch("plans/:key/prices/:interval")
  setIntervalActive(
    @Param("key") key: string,
    @Param("interval", new ParseEnumPipe(BILLING_INTERVALS))
    interval: BillingInterval,
    @Body() dto: SetPlanIntervalActiveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.setPlanIntervalActive.execute(
      key,
      interval,
      dto.active,
      user.id,
    );
  }

  @Get("coupons")
  listCoupons(@Query() query: ListBillingCouponsQueryDto) {
    return this.listBillingCoupons.execute({ active: query.active });
  }

  @Post("coupons")
  createCoupon(
    @Body() dto: CreateBillingCouponDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createBillingCoupon.execute(
      {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      user.id,
    );
  }

  @Patch("coupons/:id")
  updateCoupon(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillingCouponDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateBillingCoupon.execute(id, dto, user.id);
  }
}
