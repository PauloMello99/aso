import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Logtail } from "@logtail/node";

export interface TelemetryContext {
  module?: string | null;
  code?: string | null;
  statusCode?: number;
  path?: string | null;
  method?: string | null;
  userId?: string | null;
  orgId?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class TelemetryService implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly client: Logtail | null;
  private readonly environment = process.env["NODE_ENV"] ?? "development";

  constructor() {
    const token = process.env["BETTERSTACK_SOURCE_TOKEN"];
    const endpoint = process.env["BETTERSTACK_INGESTING_URL"];

    if (token && endpoint) {
      this.client = new Logtail(token, { endpoint });
      this.logger.log("Better Stack telemetry habilitado");
    } else {
      this.client = null;
      this.logger.warn(
        "Better Stack telemetry DESABILITADO (defina BETTERSTACK_SOURCE_TOKEN e BETTERSTACK_INGESTING_URL)",
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  captureException(error: unknown, context: TelemetryContext = {}): void {
    if (!this.client) return;

    const err = error instanceof Error ? error : new Error(String(error));
    try {
      void this.client
        .error(err.message, {
          ...this.baseContext(),
          ...this.cleanContext(context),
          error: {
            name: err.name,
            message: err.message,
            stack: err.stack ?? null,
          },
        })
        .catch((e) => this.onSendFailure(e));
    } catch (e) {
      this.onSendFailure(e);
    }
  }

  captureMessage(
    message: string,
    level: "info" | "warn" | "error" = "info",
    context: TelemetryContext = {},
  ): void {
    if (!this.client) return;

    const payload = { ...this.baseContext(), ...this.cleanContext(context) };
    try {
      void this.client[level](message, payload).catch((e) =>
        this.onSendFailure(e),
      );
    } catch (e) {
      this.onSendFailure(e);
    }
  }

  async flush(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.flush();
    } catch (e) {
      this.onSendFailure(e);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.flush();
  }

  private baseContext(): Record<string, unknown> {
    return { environment: this.environment, runtime: "backend" };
  }

  private cleanContext(context: TelemetryContext): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== null && v !== undefined),
    );
  }

  private onSendFailure(e: unknown): void {
    this.logger.error(
      `Falha ao enviar evento ao Better Stack: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}
