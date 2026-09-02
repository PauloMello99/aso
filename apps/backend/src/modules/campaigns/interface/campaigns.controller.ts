import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { CreateCampaignUseCase } from "../application/use-cases/create-campaign.use-case";
import { DeleteCampaignUseCase } from "../application/use-cases/delete-campaign.use-case";
import {
  ListCampaignsUseCase,
  type ListCampaignsResponse,
} from "../application/use-cases/list-campaigns.use-case";
import { UpdateCampaignUseCase } from "../application/use-cases/update-campaign.use-case";
import { UploadCampaignImageUseCase } from "../application/use-cases/upload-campaign-image.use-case";
import type { Campaign } from "../domain/campaign.entity";
import type { UpdateCampaignPatch } from "../domain/campaign.repository.interface";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";

/** Shape mínimo do arquivo entregue pelo `FileInterceptor` (multer). */
interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

/** Teto do bucket `campaign-images` (migration 0068): 2 MB. */
const CAMPAIGN_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * CRUD de campanhas de e-mail da org (T6 rework, Fatia 7). Sucessor do
 * `CampaignSettingsController` (removido no passo 11).
 *
 * Leitura (`GET`): qualquer membro (`OrgMembershipGuard` na classe; a policy de
 * SELECT da migration 0066 é `is_org_member(org_id)`). Escrita
 * (`POST`/`PATCH`/`DELETE`): só o dono (`OrgOwnerGuard` no método + RLS
 * INSERT/UPDATE/DELETE = `is_org_owner(org_id)`; `super_admin` age como dono,
 * ADR-0013). Paridade deliberada com o `CampaignSettingsController`: SEM
 * `ActiveSubscriptionGuard`. `trigger` não é aceito no `PATCH` — imutável após a
 * criação.
 */
@Controller("orgs/:orgId/campaigns")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class CampaignsController {
  constructor(
    private readonly listCampaigns: ListCampaignsUseCase,
    private readonly createCampaign: CreateCampaignUseCase,
    private readonly updateCampaign: UpdateCampaignUseCase,
    private readonly deleteCampaign: DeleteCampaignUseCase,
    private readonly uploadCampaignImage: UploadCampaignImageUseCase,
  ) {}

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
  ): Promise<ListCampaignsResponse> {
    return this.listCampaigns.execute(orgId);
  }

  @Post("images")
  @UseGuards(OrgOwnerGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: CAMPAIGN_IMAGE_MAX_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp|gif)$/ }),
        ],
      }),
    )
    file: UploadedImage,
  ): Promise<{ url: string }> {
    return this.uploadCampaignImage.execute({
      orgId,
      authId: user.id,
      fileName: file.originalname,
      contentType: file.mimetype,
      file: file.buffer,
    });
  }

  @Post()
  @UseGuards(OrgOwnerGuard)
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Campaign> {
    return this.createCampaign.execute({
      orgId,
      authId: user.id,
      trigger: dto.trigger,
      name: dto.name,
      enabled: dto.enabled ?? false,
      subject: dto.subject ?? null,
      body: dto.body ?? null,
      inactivityMonths: dto.inactivityMonths ?? null,
    });
  }

  @Patch(":id")
  @UseGuards(OrgOwnerGuard)
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Campaign> {
    const patch: UpdateCampaignPatch = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.inactivityMonths !== undefined
        ? { inactivityMonths: dto.inactivityMonths }
        : {}),
    };
    return this.updateCampaign.execute({ orgId, authId: user.id, id, patch });
  }

  @Delete(":id")
  @UseGuards(OrgOwnerGuard)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.deleteCampaign.execute({ orgId, authId: user.id, id });
  }
}
