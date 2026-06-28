import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { AdjustStockUseCase } from "../application/use-cases/adjust-stock.use-case";
import { SetMaterialArchivedUseCase } from "../application/use-cases/set-material-archived.use-case";
import { GetStockSettingsUseCase } from "../application/use-cases/get-stock-settings.use-case";
import { SetStockIntervalUseCase } from "../application/use-cases/set-stock-interval.use-case";
import { CreateStockVerificationUseCase } from "../application/use-cases/create-stock-verification.use-case";
import { ListStockVerificationsUseCase } from "../application/use-cases/list-stock-verifications.use-case";
import {
  CreateVerificationDto,
  SetStockIntervalDto,
} from "./dto/stock-verification.dto";
import { CreateMaterialUseCase } from "../application/use-cases/create-material.use-case";
import { DeleteMaterialUseCase } from "../application/use-cases/delete-material.use-case";
import { ListMaterialsUseCase } from "../application/use-cases/list-materials.use-case";
import { ExportMaterialsUseCase } from "../application/use-cases/export-materials.use-case";
import { parseFields } from "../../../common/csv/csv.util";
import { ListStockMovementsUseCase } from "../application/use-cases/list-stock-movements.use-case";
import { RestockMaterialUseCase } from "../application/use-cases/restock-material.use-case";
import { UpdateMaterialUseCase } from "../application/use-cases/update-material.use-case";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { CreateMaterialDto } from "./dto/create-material.dto";
import { RestockMaterialDto } from "./dto/restock-material.dto";
import { UpdateMaterialDto } from "./dto/update-material.dto";

@Controller("orgs/:orgId/materials")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("stock")
export class MaterialsController {
  constructor(
    private readonly listMaterials: ListMaterialsUseCase,
    private readonly exportMaterials: ExportMaterialsUseCase,
    private readonly createMaterial: CreateMaterialUseCase,
    private readonly updateMaterial: UpdateMaterialUseCase,
    private readonly deleteMaterial: DeleteMaterialUseCase,
    private readonly restockMaterial: RestockMaterialUseCase,
    private readonly adjustStock: AdjustStockUseCase,
    private readonly setArchived: SetMaterialArchivedUseCase,
    private readonly listMovements: ListStockMovementsUseCase,
    private readonly getStockSettings: GetStockSettingsUseCase,
    private readonly setStockInterval: SetStockIntervalUseCase,
    private readonly createVerification: CreateStockVerificationUseCase,
    private readonly listVerifications: ListStockVerificationsUseCase,
  ) {}

  /* ─── Conferência periódica de estoque ──────────────────────── */

  @Get("stock-settings")
  async stockSettings(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.getStockSettings.execute(orgId);
  }

  @Put("stock-settings")
  async saveStockSettings(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: SetStockIntervalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.setStockInterval.execute(orgId, user.id, dto.intervalDays ?? null);
  }

  @Get("verifications")
  async verifications(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listVerifications.execute(orgId);
  }

  @Post("verifications")
  async addVerification(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateVerificationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createVerification.execute({
      orgId,
      performedBy: user.id,
      note: dto.note ?? null,
      reconcile: dto.reconcile ?? false,
      items: dto.items,
    });
  }

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Query("categoryId") categoryId?: string,
    @Query("lowStock") lowStock?: string,
    @Query("q") q?: string,
    @Query("archived") archived?: string,
    @Query("shareable") shareable?: string,
    @Query("minCost") minCost?: string,
    @Query("maxCost") maxCost?: string,
    @Query("sortBy") sortBy?: string,
  ) {
    return this.listMaterials.execute(orgId, {
      categoryId,
      lowStockOnly: lowStock === "true",
      name: q || undefined,
      archived: archived === "true",
      shareable:
        shareable === "true" ? true : shareable === "false" ? false : undefined,
      minCost: minCost || undefined,
      maxCost: maxCost || undefined,
      sortBy: sortBy === "name" ? "name" : "lastUsed",
    });
  }

  @Get("export")
  async export(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Res() res: Response,
    @Query("categoryId") categoryId?: string,
    @Query("lowStock") lowStock?: string,
    @Query("q") q?: string,
    @Query("archived") archived?: string,
    @Query("shareable") shareable?: string,
    @Query("minCost") minCost?: string,
    @Query("maxCost") maxCost?: string,
    @Query("fields") fields?: string,
  ) {
    const csv = await this.exportMaterials.execute(
      orgId,
      {
        categoryId: categoryId || undefined,
        lowStockOnly: lowStock === "true",
        name: q || undefined,
        archived: archived === "true",
        shareable:
          shareable === "true"
            ? true
            : shareable === "false"
              ? false
              : undefined,
        minCost: minCost || undefined,
        maxCost: maxCost || undefined,
      },
      parseFields(fields),
    );
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="estoque-${date}.csv"`,
    );
    res.send(csv);
  }

  @Post()
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.createMaterial.execute({ ...dto, orgId });
  }

  @Patch(":id")
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.updateMaterial.execute(id, orgId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.deleteMaterial.execute(id, orgId);
  }

  @Post(":id/restock")
  async restock(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RestockMaterialDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.restockMaterial.execute({
      orgId,
      materialId: id,
      quantity: dto.quantity,
      note: dto.note,
      createdBy: user.id,
    });
  }

  @Post(":id/adjust")
  async adjust(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adjustStock.execute({
      orgId,
      materialId: id,
      quantityDelta: dto.quantityDelta,
      note: dto.note,
      createdBy: user.id,
    });
  }

  @Post(":id/archive")
  async archive(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.setArchived.execute(id, orgId, true);
  }

  @Post(":id/unarchive")
  async unarchive(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.setArchived.execute(id, orgId, false);
  }

  @Get(":id/movements")
  async movements(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.listMovements.execute(id, orgId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}

