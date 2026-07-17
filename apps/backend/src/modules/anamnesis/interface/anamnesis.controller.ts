import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CreateOrUpdateAnamnesisFormUseCase } from "../application/use-cases/create-or-update-anamnesis-form.use-case";
import { ListAnamnesisFormVersionsUseCase } from "../application/use-cases/list-anamnesis-form-versions.use-case";
import { GetCurrentAnamnesisFormVersionUseCase } from "../application/use-cases/get-current-anamnesis-form-version.use-case";
import { SaveAnamnesisFormDto } from "./dto/save-anamnesis-form.dto";

@Controller("orgs/:orgId/service-types/:serviceTypeId/anamnesis-form")
@UseGuards(AuthGuard, OrgMembershipGuard, OrgModuleGuard)
@RequireModule("services")
export class AnamnesisController {
  constructor(
    private readonly createOrUpdateForm: CreateOrUpdateAnamnesisFormUseCase,
    private readonly listVersions: ListAnamnesisFormVersionsUseCase,
    private readonly getCurrentVersion: GetCurrentAnamnesisFormVersionUseCase,
  ) {}

  @Get()
  async getCurrent(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("serviceTypeId", ParseUUIDPipe) serviceTypeId: string,
  ) {
    return this.getCurrentVersion.execute(serviceTypeId, orgId);
  }

  @Get("versions")
  async versions(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("serviceTypeId", ParseUUIDPipe) serviceTypeId: string,
  ) {
    return this.listVersions.execute(serviceTypeId, orgId);
  }

  @Post("versions")
  @UseGuards(OrgOwnerGuard)
  async createVersion(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("serviceTypeId", ParseUUIDPipe) serviceTypeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveAnamnesisFormDto,
  ) {
    return this.createOrUpdateForm.execute({
      orgId,
      serviceTypeId,
      authId: user.id,
      questions: dto.questions,
    });
  }
}
