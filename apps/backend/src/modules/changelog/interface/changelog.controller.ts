import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { GetChangelogUseCase } from "../application/use-cases/get-changelog.use-case";
import { MarkChangelogSeenUseCase } from "../application/use-cases/mark-changelog-seen.use-case";
import { MarkChangelogSeenDto } from "./dto/mark-changelog-seen.dto";

@Controller("changelog")
@UseGuards(AuthGuard)
export class ChangelogController {
  constructor(
    private readonly getChangelogUseCase: GetChangelogUseCase,
    private readonly markChangelogSeenUseCase: MarkChangelogSeenUseCase,
  ) {}

  @Get()
  getChangelog(@CurrentUser() user: AuthUser) {
    return this.getChangelogUseCase.execute(user);
  }

  @Post("seen")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markSeen(
    @CurrentUser() user: AuthUser,
    @Body() dto: MarkChangelogSeenDto,
  ): Promise<void> {
    await this.markChangelogSeenUseCase.execute(user, dto.version);
  }
}
