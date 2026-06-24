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
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListServicesUseCase } from "../application/use-cases/list-services.use-case";
import { GetServiceUseCase } from "../application/use-cases/get-service.use-case";
import { CreateServiceUseCase } from "../application/use-cases/create-service.use-case";
import { UpdateServiceUseCase } from "../application/use-cases/update-service.use-case";
import { CancelServiceUseCase } from "../application/use-cases/cancel-service.use-case";
import { RegisterPaymentUseCase } from "../application/use-cases/register-payment.use-case";
import { ListServiceTypesUseCase } from "../application/use-cases/list-service-types.use-case";
import { CreateServiceTypeUseCase } from "../application/use-cases/create-service-type.use-case";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CreateServiceTypeDto } from "./dto/create-service-type.dto";
import type { ServiceStatusFilter } from "../domain/service.repository.interface";

const STATUS_VALUES: ServiceStatusFilter[] = ["pending", "paid", "canceled"];

/** Primeiro dia do mês vigente (filtro default da listagem). */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Controller("orgs/:orgId/services")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class ServicesController {
  constructor(
    private readonly listServices: ListServicesUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly createService: CreateServiceUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly cancelService: CancelServiceUseCase,
    private readonly registerPayment: RegisterPaymentUseCase,
    private readonly listTypes: ListServiceTypesUseCase,
    private readonly createType: CreateServiceTypeUseCase,
  ) {}

  /* ─── Tipos de serviço (criáveis inline) ─────────────────────── */

  @Get("types")
  async types(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listTypes.execute(orgId);
  }

  @Post("types")
  async addType(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateServiceTypeDto,
  ) {
    return this.createType.execute(orgId, dto.name, dto.description ?? null);
  }

  /* ─── Serviços ───────────────────────────────────────────────── */

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("serviceTypeId") serviceTypeId?: string,
    @Query("customerId") customerId?: string,
    @Query("performedBy") performedBy?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    // Default = mês vigente (1º do mês → agora), não "hoje − 30 dias".
    const fromDate = from ? new Date(from) : startOfCurrentMonth();
    const toDate = to ? new Date(to) : undefined;

    return this.listServices.execute({
      orgId,
      authId: user.id,
      filter: {
        from: fromDate,
        to: toDate,
        serviceTypeId: serviceTypeId || undefined,
        customerId: customerId || undefined,
        performedBy: performedBy || undefined,
        status: STATUS_VALUES.includes(status as ServiceStatusFilter)
          ? (status as ServiceStatusFilter)
          : undefined,
        q: q || undefined,
      },
    });
  }

  @Get(":id")
  async get(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getService.execute({ orgId, serviceId: id, authId: user.id });
  }

  @Post()
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.createService.execute({
      orgId,
      authId: user.id,
      customerId: dto.customerId ?? null,
      serviceTypeId: dto.serviceTypeId ?? null,
      performedBy: dto.performedBy ?? null,
      description: dto.description ?? null,
      amountCents: dto.amountCents,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      materials: dto.materials ?? [],
    });
  }

  @Patch(":id")
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.updateService.execute({
      orgId,
      serviceId: id,
      authId: user.id,
      customerId: dto.customerId,
      serviceTypeId: dto.serviceTypeId,
      performedBy: dto.performedBy,
      description: dto.description,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
    });
  }

  @Post(":id/cancel")
  async cancel(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cancelService.execute({
      orgId,
      serviceId: id,
      authId: user.id,
    });
  }

  @Post(":id/pay")
  async pay(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerPayment.execute({
      orgId,
      serviceId: id,
      authId: user.id,
    });
  }
}
