import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const REVALIDATE_TIMEOUT_MS = 5_000;

/**
 * Best-effort trigger for the frontend's ISR cache revalidation
 * (`POST /api/revalidate`) whenever the plan catalog changes (billing plan /
 * price created, updated, or drifted-corrected from Stripe). Injected as a
 * concrete class, not behind a Symbol token/port: unlike `IInboundEmailClient`
 * (which has a real domain port with a swappable Resend implementation),
 * there is no alternate implementation to swap here — this mirrors how
 * `TelemetryService` is injected directly into the same use-cases.
 *
 * NEVER throws — a failure to revalidate the frontend cache must not fail a
 * Stripe webhook handler (which would make Stripe retry the event pointlessly)
 * nor the cron catalog-reconciliation job. Every failure mode (missing
 * config, network error, timeout, non-2xx response) is logged as a warning
 * and swallowed.
 */
@Injectable()
export class FrontendRevalidationClient {
  private readonly logger = new Logger(FrontendRevalidationClient.name);

  constructor(private readonly config: ConfigService) {}

  async revalidate(path: string): Promise<void> {
    const frontendUrl = this.config.get<string>("FRONTEND_URL");
    const secret = this.config.get<string>("REVALIDATE_SECRET");

    if (!secret) {
      this.logger.warn(
        "REVALIDATE_SECRET não configurado — pulando revalidação de cache ISR do frontend (no-op)",
      );
      return;
    }

    if (!frontendUrl) {
      this.logger.warn(
        "FRONTEND_URL não configurado — pulando revalidação de cache ISR do frontend (no-op)",
      );
      return;
    }

    try {
      const res = await fetch(`${frontendUrl}/api/revalidate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ path }),
        signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
      });

      if (!res.ok) {
        this.logger.warn(
          `Falha ao revalidar cache ISR do frontend para "${path}": HTTP ${res.status}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao revalidar cache ISR do frontend para "${path}" (timeout ou erro de rede): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
