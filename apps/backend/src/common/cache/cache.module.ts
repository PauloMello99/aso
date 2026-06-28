import { Global, Module } from "@nestjs/common";
import { TtlCache } from "./ttl-cache.service";

/** Disponibiliza o {@link TtlCache} globalmente (qualquer módulo pode injetar). */
@Global()
@Module({
  providers: [TtlCache],
  exports: [TtlCache],
})
export class AppCacheModule {}
