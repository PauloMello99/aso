import { Module } from "@nestjs/common";
import { GetMeUseCase } from "./application/use-cases/get-me.use-case";
import { UserInfrastructureModule } from "./infrastructure/user-infrastructure.module";

@Module({
  imports: [UserInfrastructureModule],
  providers: [GetMeUseCase],
  exports: [UserInfrastructureModule, GetMeUseCase],
})
export class UserModule {}
