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
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CreateCustomerUseCase } from "../application/use-cases/create-customer.use-case";
import { DeleteCustomerUseCase } from "../application/use-cases/delete-customer.use-case";
import { ListCustomersUseCase } from "../application/use-cases/list-customers.use-case";
import { ListCustomerOriginsUseCase } from "../application/use-cases/list-customer-origins.use-case";
import { ExportCustomersUseCase } from "../application/use-cases/export-customers.use-case";
import { UpdateCustomerUseCase } from "../application/use-cases/update-customer.use-case";
import {
  UploadCustomerAttachmentUseCase,
  ListCustomerAttachmentsUseCase,
  DeleteCustomerAttachmentUseCase,
} from "../application/use-cases/customer-attachments.use-cases";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

interface UploadedDoc {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller("orgs/:orgId/customers")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("clients")
export class CustomersController {
  constructor(
    private readonly listCustomers: ListCustomersUseCase,
    private readonly listOrigins: ListCustomerOriginsUseCase,
    private readonly exportCustomers: ExportCustomersUseCase,
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly deleteCustomer: DeleteCustomerUseCase,
    private readonly uploadAttachment: UploadCustomerAttachmentUseCase,
    private readonly listAttachments: ListCustomerAttachmentsUseCase,
    private readonly deleteAttachment: DeleteCustomerAttachmentUseCase,
  ) {}

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("search") search?: string,
    @Query("enabled") enabled?: string,
  ) {
    return this.listCustomers.execute(orgId, {
      search: search?.trim() || undefined,
      enabledOnly: enabled === "true",
    });
  }

  @Get("origins")
  async origins(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listOrigins.execute(orgId);
  }

  @Get("export")
  async export(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Res() res: Response,
    @Query("search") search?: string,
    @Query("enabled") enabled?: string,
  ) {
    const csv = await this.exportCustomers.execute(orgId, {
      search: search?.trim() || undefined,
      enabledOnly: enabled === "true",
    });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="clientes-${date}.csv"`,
    );
    res.send(csv);
  }

  @Post()
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createCustomer.execute({ ...dto, orgId, createdBy: user.id });
  }

  @Patch(":id")
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.updateCustomer.execute(id, orgId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.deleteCustomer.execute(id, orgId);
  }

  /* ─── Anexos ────────────────────────────────────────────────── */

  @Get(":id/attachments")
  async attachments(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.listAttachments.execute(id, orgId);
  }

  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file"))
  async addAttachment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
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
      contentType: file.mimetype,
      file: file.buffer,
      uploadedBy: user.id,
    });
  }

  @Delete(":id/attachments/:attachmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
  ) {
    await this.deleteAttachment.execute(attachmentId, orgId);
  }
}
