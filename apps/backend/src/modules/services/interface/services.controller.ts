import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListServicesUseCase } from "../application/use-cases/list-services.use-case";
import { ExportServicesUseCase } from "../application/use-cases/export-services.use-case";
import { GetServiceUseCase } from "../application/use-cases/get-service.use-case";
import {
  parseFields,
  resolveCsvDelimiter,
  resolveExportFormat,
} from "../../../common/csv/csv.util";
import { CreateServiceUseCase } from "../application/use-cases/create-service.use-case";
import { UpdateServiceUseCase } from "../application/use-cases/update-service.use-case";
import { CancelServiceUseCase } from "../application/use-cases/cancel-service.use-case";
import { RegisterPaymentUseCase } from "../application/use-cases/register-payment.use-case";
import { CorrectServicePaymentUseCase } from "../application/use-cases/correct-service-payment.use-case";
import { ListServiceTypesUseCase } from "../application/use-cases/list-service-types.use-case";
import { CreateServiceTypeUseCase } from "../application/use-cases/create-service-type.use-case";
import { UpdateServiceTypeUseCase } from "../application/use-cases/update-service-type.use-case";
import {
  UploadServiceMediaUseCase,
  ListServiceMediaUseCase,
  DeleteServiceMediaUseCase,
} from "../application/use-cases/service-media.use-cases";
import {
  CreateServiceDto,
  SERVICE_PAYMENT_METHODS,
} from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CorrectServicePaymentDto } from "./dto/correct-service-payment.dto";
import { CreateServiceTypeDto } from "./dto/create-service-type.dto";
import { UpdateServiceTypeDto } from "./dto/update-service-type.dto";
import type { ServiceStatusFilter } from "../domain/service.repository.interface";
import type { PaymentMethod } from "../domain/service.entity";

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const STATUS_VALUES: ServiceStatusFilter[] = ["pending", "paid", "canceled"];

/** Converte um query param numérico (centavos) em inteiro, ou undefined. */
function parseCents(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** Primeiro dia do mês vigente (filtro default da listagem). */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Controller("orgs/:orgId/services")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("services")
export class ServicesController {
  constructor(
    private readonly listServices: ListServicesUseCase,
    private readonly exportServices: ExportServicesUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly createService: CreateServiceUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly cancelService: CancelServiceUseCase,
    private readonly registerPayment: RegisterPaymentUseCase,
    private readonly correctServicePayment: CorrectServicePaymentUseCase,
    private readonly listTypes: ListServiceTypesUseCase,
    private readonly createType: CreateServiceTypeUseCase,
    private readonly updateType: UpdateServiceTypeUseCase,
    private readonly uploadMedia: UploadServiceMediaUseCase,
    private readonly listMedia: ListServiceMediaUseCase,
    private readonly deleteMedia: DeleteServiceMediaUseCase,
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

  // Owner-only: marcar um tipo como exigindo verificação de idade é regra de
  // negócio sensível (mesmo padrão de restrição de "categories" no cashier).
  @Patch("types/:typeId")
  @UseGuards(OrgOwnerGuard)
  async updateTypeById(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("typeId", ParseUUIDPipe) typeId: string,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.updateType.execute(orgId, typeId, {
      name: dto.name,
      description: dto.description,
      requiresAgeVerification: dto.requiresAgeVerification,
    });
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
    @Query("paymentMethod") paymentMethod?: string,
    @Query("minCents") minCents?: string,
    @Query("maxCents") maxCents?: string,
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
        paymentMethod: SERVICE_PAYMENT_METHODS.includes(
          paymentMethod as (typeof SERVICE_PAYMENT_METHODS)[number],
        )
          ? (paymentMethod as PaymentMethod)
          : undefined,
        minCents: parseCents(minCents),
        maxCents: parseCents(maxCents),
        q: q || undefined,
      },
    });
  }

  @Get("export")
  async export(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("serviceTypeId") serviceTypeId?: string,
    @Query("customerId") customerId?: string,
    @Query("performedBy") performedBy?: string,
    @Query("status") status?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("minCents") minCents?: string,
    @Query("maxCents") maxCents?: string,
    @Query("q") q?: string,
    @Query("fields") fields?: string,
    @Query("format") format?: string,
    @Query("delimiter") delimiter?: string,
  ) {
    const exportFormat = resolveExportFormat(format);
    const file = await this.exportServices.execute(
      orgId,
      user.id,
      {
        from: from ? new Date(from) : startOfCurrentMonth(),
        to: to ? new Date(to) : undefined,
        serviceTypeId: serviceTypeId || undefined,
        customerId: customerId || undefined,
        performedBy: performedBy || undefined,
        status: STATUS_VALUES.includes(status as ServiceStatusFilter)
          ? (status as ServiceStatusFilter)
          : undefined,
        paymentMethod: SERVICE_PAYMENT_METHODS.includes(
          paymentMethod as (typeof SERVICE_PAYMENT_METHODS)[number],
        )
          ? (paymentMethod as PaymentMethod)
          : undefined,
        minCents: parseCents(minCents),
        maxCents: parseCents(maxCents),
        q: q || undefined,
      },
      parseFields(fields),
      exportFormat,
      resolveCsvDelimiter(delimiter),
    );
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === "xlsx") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="servicos-${date}.xlsx"`,
      );
    } else {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="servicos-${date}.csv"`,
      );
    }
    res.send(file);
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

  @Patch(":id/payment")
  @UseGuards(OrgOwnerGuard)
  async correctPayment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CorrectServicePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correctServicePayment.execute({
      orgId,
      serviceId: id,
      authId: user.id,
      grossCents: dto.grossCents,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      transactedAt: dto.transactedAt ? new Date(dto.transactedAt) : undefined,
    });
  }

  /* ─── Mídia (fotos) ──────────────────────────────────────────── */

  @Get(":id/media")
  async media(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.listMedia.execute(id, orgId);
  }

  @Post(":id/media")
  @UseInterceptors(FileInterceptor("file"))
  async addMedia(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 307200 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
        ],
      }),
    )
    file: UploadedImage,
  ) {
    return this.uploadMedia.execute({
      orgId,
      serviceId: id,
      fileName: file.originalname,
      contentType: file.mimetype,
      file: file.buffer,
      uploadedBy: user.id,
    });
  }

  @Delete(":id/media/:mediaId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMedia(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("mediaId", ParseUUIDPipe) mediaId: string,
  ) {
    await this.deleteMedia.execute(mediaId, orgId);
  }
}
