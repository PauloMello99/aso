import { Global, Module } from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";

/**
 * Disponibiliza o TelemetryService (Better Stack error tracking) para toda a
 * aplicação sem reimportar em cada módulo, espelhando AuditModule.
 */
@Global()
@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
