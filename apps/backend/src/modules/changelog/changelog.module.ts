import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { GetChangelogUseCase } from "./application/use-cases/get-changelog.use-case";
import { MarkChangelogSeenUseCase } from "./application/use-cases/mark-changelog-seen.use-case";
import { ChangelogController } from "./interface/changelog.controller";

@Module({
  imports: [AuthModule, UserModule],
  controllers: [ChangelogController],
  providers: [GetChangelogUseCase, MarkChangelogSeenUseCase],
})
export class ChangelogModule {}
