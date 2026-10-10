import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IQuoteRequestPurgeRepository,
  QUOTE_REQUEST_PURGE_REPOSITORY,
} from "../../domain/quote-request-purge.repository.interface";
import {
  QUOTE_PURGE_ALERT_ATTEMPTS,
  QUOTE_PURGE_BATCH_LIMIT,
  QUOTE_PURGE_LEASE_MS,
  QUOTE_PURGE_SCOPE,
  toPurgeErrorCode,
} from "../../domain/quote-request-lifecycle";
import { QuoteRequestPurger } from "../quote-request-purger";

export interface PurgeExpiredQuoteRequestsResult {
  claimed: number;
  deleted: number;
  imagesRemoved: number;
  failed: number;
}

/**
 * Job cross-org que purga pedidos de orcamento vencidos ou com purga solicitada:
 * reivindica um lote (lease de 10 min), remove os arquivos do storage, verifica e
 * so entao apaga a linha (ou so as imagens). Falha de um item nunca derruba o
 * lote: o codigo saneado vai para purge_last_error e a fila tenta de novo apos o
 * lease.
 *
 * Roda SEMPRE, sem kill-switch nem PUBLIC_QUOTE_FORM_ENABLED: dados coletados com
 * a flag ligada precisam ser purgados (prazo LGPD) mesmo depois de ela ser
 * desligada. Logs: so ids, tentativa, escopo e codigo — nunca PII nem texto de
 * provider.
 */
@Injectable()
export class PurgeExpiredQuoteRequestsUseCase {
  private readonly logger = new Logger(PurgeExpiredQuoteRequestsUseCase.name);

  constructor(
    @Inject(QUOTE_REQUEST_PURGE_REPOSITORY)
    private readonly purgeRepo: IQuoteRequestPurgeRepository,
    private readonly purger: QuoteRequestPurger,
  ) {}

  async execute(
    now: Date = new Date(),
  ): Promise<PurgeExpiredQuoteRequestsResult> {
    // Erro do claim propaga (mensagem fixa vinda do repo sanitizado).
    const claims = await this.purgeRepo.claimDuePurges(
      now,
      QUOTE_PURGE_LEASE_MS,
      QUOTE_PURGE_BATCH_LIMIT,
    );

    const result: PurgeExpiredQuoteRequestsResult = {
      claimed: claims.length,
      deleted: 0,
      imagesRemoved: 0,
      failed: 0,
    };

    for (const claim of claims) {
      try {
        const completed = await this.purger.purge(claim);
        // Claim perdido / linha ja apagada nao conta como purgado.
        if (!completed) continue;
        if (claim.scope === QUOTE_PURGE_SCOPE.ALL) result.deleted += 1;
        else result.imagesRemoved += 1;
      } catch (error) {
        result.failed += 1;
        await this.reportFailure(claim, error);
      }
    }

    return result;
  }

  private async reportFailure(
    claim: { id: string; orgId: string; scope: string; attempts: number },
    error: unknown,
  ): Promise<void> {
    const code = toPurgeErrorCode(error);
    try {
      await this.purgeRepo.recordPurgeFailure(claim.orgId, claim.id, code);
    } catch (recordError) {
      this.logger.warn(
        `quote purge: could not record failure org=${claim.orgId} request=${claim.id} error=${toPurgeErrorCode(recordError)}`,
      );
    }

    const message = `quote purge failed org=${claim.orgId} request=${claim.id} scope=${claim.scope} attempt=${claim.attempts} code=${code}`;
    if (claim.attempts >= QUOTE_PURGE_ALERT_ATTEMPTS) this.logger.error(message);
    else this.logger.warn(message);
  }
}
