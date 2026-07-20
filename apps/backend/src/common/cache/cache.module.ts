import { Global, Module } from "@nestjs/common";
import { TtlCache } from "./ttl-cache.service";

@Global()
@Module({
  providers: [TtlCache],
  exports: [TtlCache],
})
export class AppCacheModule {}
