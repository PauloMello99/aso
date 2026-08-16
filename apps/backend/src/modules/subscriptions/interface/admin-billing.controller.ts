import {
  Body,
  Controller,
  Get,
  Param,
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
import { SyncPlanCatalogUseCase } from "../application/use-cases/sync-plan-catalog.use-case";
import { ListBillingPlansUseCase } from "../application/use-cases/list-billing-plans.use-case";
import { UpdateBillingPlanProductUseCase } from "../application/use-cases/update-billing-plan-product.use-case";
import { RotateBillingPlanPriceUseCase } from "../application/use-cases/rotate-billing-plan-price.use-case";
import { CreateBillingCouponUseCase } from "../application/use-cases/create-billing-coupon.use-case";
import { ListBillingCouponsUseCase } from "../application/use-cases/list-billing-coupons.use-case";
import { UpdateBillingCouponUseCase } from "../application/use-cases/update-billing-coupon.use-case";
import { UpdateBillingPlanProductDto } from "./dto/update-billing-plan-product.dto";
import { RotateBillingPlanPriceDto } from "./dto/rotate-billing-plan-price.dto";
import { CreateBillingCouponDto } from "./dto/create-billing-coupon.dto";
import { UpdateBillingCouponDto } from "./dto/update-billing-coupon.dto";
import { ListBillingCouponsQueryDto } from "./dto/list-billing-coupons-query.dto";

@Controller("admin/billing")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminBillingController {
  constructor(
    private readonly syncPlanCatalog: SyncPlanCatalogUseCase,
    private readonly listBillingPlans: ListBillingPlansUseCase,
    private readonly updateBillingPlanProduct: UpdateBillingPlanProductUseCase,
    private readonly rotateBillingPlanPrice: RotateBillingPlanPriceUseCase,
    private readonly createBillingCoupon: CreateBillingCouponUseCase,
    private readonly listBillingCoupons: ListBillingCouponsUseCase,
    private readonly updateBillingCoupon: UpdateBillingCouponUseCase,
  ) {}

  @Post("plans/sync")
  sync() {
    return this.syncPlanCatalog.execute();
  }

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

  @Post("plans/:key/price")
  rotatePrice(
    @Param("key") key: string,
    @Body() dto: RotateBillingPlanPriceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rotateBillingPlanPrice.execute(key, dto, user.id);
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
