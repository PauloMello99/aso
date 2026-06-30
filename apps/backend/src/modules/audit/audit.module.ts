import { Global, Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuditService } from "./audit.service";

@Global()
@Module({
  imports: [UserModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
