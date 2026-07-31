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
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { ActiveSubscriptionGuard } from "../../subscriptions/interface/guards/active-subscription.guard";
import {
  AllowAnyOrgMember,
  RequireModule,
} from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CreateCustomerUseCase } from "../application/use-cases/create-customer.use-case";
import { DeleteCustomerUseCase } from "../application/use-cases/delete-customer.use-case";
import { ListCustomersUseCase } from "../application/use-cases/list-customers.use-case";
import { ListCustomerOriginsUseCase } from "../application/use-cases/list-customer-origins.use-case";
import { ExportCustomersUseCase } from "../application/use-cases/export-customers.use-case";
import { GetCustomerUseCase } from "../application/use-cases/get-customer.use-case";
import { UpdateCustomerUseCase } from "../application/use-cases/update-customer.use-case";
import {
  UploadCustomerAttachmentUseCase,
  ListCustomerAttachmentsUseCase,
  DeleteCustomerAttachmentUseCase,
  RenameCustomerAttachmentUseCase,
} from "../application/use-cases/customer-attachments.use-cases";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { RenameCustomerAttachmentDto } from "./dto/rename-customer-attachment.dto";
import { UploadCustomerAttachmentDto } from "./dto/upload-customer-attachment.dto";
import type { ListCustomersFilter } from "../domain/customer.repository.interface";
import {
  parseFields,
  resolveExportFormat,
} from "../../../common/csv/csv.util";

interface UploadedDoc {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const GENDERS = ["male", "female", "other"] as const;

function buildCustomersFilter(q: {
  search?: string;
  enabled?: string;
  status?: string;
  originId?: string;
  gender?: string;
  from?: string;
  to?: string;
  birthMonth?: string;
  city?: string;
  state?: string;
}): ListCustomersFilter {
  const parsedBirthMonth = q.birthMonth ? Number(q.birthMonth) : NaN;
  return {
    search: q.search?.trim() || undefined,
    enabledOnly: q.enabled === "true",
    status:
      q.status === "active" || q.status === "inactive" ? q.status : undefined,
    originId: q.originId || undefined,
    gender: GENDERS.includes(q.gender as (typeof GENDERS)[number])
      ? (q.gender as (typeof GENDERS)[number])
      : undefined,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    birthMonth:
      Number.isInteger(parsedBirthMonth) &&
      parsedBirthMonth >= 1 &&
      parsedBirthMonth <= 12
        ? parsedBirthMonth
        : undefined,
    city: q.city?.trim() || undefined,
    state: q.state?.trim() || undefined,
  };
}

@Controller("orgs/:orgId/customers")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("clients")
export class CustomersController {
  constructor(
    private readonly listCustomers: ListCustomersUseCase,
    private readonly listOrigins: ListCustomerOriginsUseCase,
    private readonly exportCustomers: ExportCustomersUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly deleteCustomer: DeleteCustomerUseCase,
    private readonly uploadAttachment: UploadCustomerAttachmentUseCase,
    private readonly listAttachments: ListCustomerAttachmentsUseCase,
    private readonly deleteAttachment: DeleteCustomerAttachmentUseCase,
    private readonly renameAttachment: RenameCustomerAttachmentUseCase,
  ) {}

  @Get()
  @AllowAnyOrgMember()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("search") search?: string,
    @Query("enabled") enabled?: string,
    @Query("status") status?: string,
    @Query("originId") originId?: string,
    @Query("gender") gender?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("birthMonth") birthMonth?: string,
    @Query("city") city?: string,
    @Query("state") state?: string,
  ) {
    return this.listCustomers.execute(
      orgId,
      buildCustomersFilter({
        search,
        enabled,
        status,
        originId,
        gender,
        from,
        to,
        birthMonth,
        city,
        state,
      }),
    );
  }

  @Get("origins")
  @AllowAnyOrgMember()
  async origins(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listOrigins.execute(orgId);
  }

  @Get("export")
  async export(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Res() res: Response,
    @Query("search") search?: string,
    @Query("enabled") enabled?: string,
    @Query("status") status?: string,
    @Query("originId") originId?: string,
    @Query("gender") gender?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("birthMonth") birthMonth?: string,
    @Query("city") city?: string,
    @Query("state") state?: string,
    @Query("fields") fields?: string,
    @Query("format") format?: string,
  ) {
    const exportFormat = resolveExportFormat(format);
    const file = await this.exportCustomers.execute(
      orgId,
      buildCustomersFilter({
        search,
        enabled,
        status,
        originId,
        gender,
        from,
        to,
        birthMonth,
        city,
        state,
      }),
      parseFields(fields),
      exportFormat,
    );
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === "xlsx") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clientes-${date}.xlsx"`,
      );
    } else {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clientes-${date}.csv"`,
      );
    }
    res.send(file);
  }

  @Get(":id")
  async findOne(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.getCustomer.execute(id, orgId);
  }

  @Post()
  @UseGuards(ActiveSubscriptionGuard)
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createCustomer.execute({ ...dto, orgId, createdBy: user.id });
  }

  @Patch(":id")
  @UseGuards(ActiveSubscriptionGuard)
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.updateCustomer.execute(id, orgId, dto);
  }

  @Delete(":id")
  @UseGuards(ActiveSubscriptionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.deleteCustomer.execute(id, orgId);
  }

  @Get(":id/attachments")
  async attachments(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.listAttachments.execute(id, orgId);
  }

  @Post(":id/attachments")
  @UseGuards(ActiveSubscriptionGuard)
  @UseInterceptors(FileInterceptor("file"))
  async addAttachment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadCustomerAttachmentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/,
          }),
        ],
      }),
    )
    file: UploadedDoc,
  ) {
    return this.uploadAttachment.execute({
      orgId,
      customerId: id,
      fileName: file.originalname,
      baseName: dto.baseName,
      contentType: file.mimetype,
      file: file.buffer,
      uploadedBy: user.id,
    });
  }

  @Delete(":id/attachments/:attachmentId")
  @UseGuards(ActiveSubscriptionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
  ) {
    await this.deleteAttachment.execute(attachmentId, orgId);
  }

  @Patch(":id/attachments/:attachmentId")
  @UseGuards(ActiveSubscriptionGuard)
  async renameAttachmentHandler(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @Body() dto: RenameCustomerAttachmentDto,
  ) {
    return this.renameAttachment.execute(
      attachmentId,
      id,
      orgId,
      dto.baseName,
    );
  }
}
