import { Module } from "@nestjs/common";
import { USER_REPOSITORY } from "../domain/user.repository.interface";
import { DrizzleUserRepository } from "./persistence/user.repository";

@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UserInfrastructureModule {}
