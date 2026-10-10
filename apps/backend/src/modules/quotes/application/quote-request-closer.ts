import { Inject, Injectable, Logger } from "@nestjs/common";
import { registerPostCommit } from "../../../database/database.module";
import {
  CloseQuoteRequestInput,
  IQuoteRequestPurgeRepository,
  QUOTE_REQUEST_PURGE_REPOSITORY,
} from "../domain/quote-request-purge.repository.interface";
import {
  QUOTE_PURGE_SCOPE,
  toPurgeErrorCode,
} from "../domain/quote-request-lifecycle";
import { QuoteRequestPurger } from "./quote-request-purger";

export type QuoteRequestCloseResult = {
  contactRetained: boolean;
  purged: boolean;
};

/**
 * Encerra um pedido (close-and-claim) e tenta a purga imediata; a fila do cron e o
 * fallback se a purga falhar. Tudo aqui e DRIZZLE_ADMIN/Storage, FORA da transacao de
 * sessao: por isso o try/catch em volta do purger e seguro (nao replicar em escrita
 * de sessao).
 */
@Injectable()
export class QuoteRequestCloser {
  private readonly logger = new Logger(QuoteRequestCloser.name);

  constructor(
    @Inject(QUOTE_REQUEST_PURGE_REPOSITORY)
    private readonly purgeRepo: IQuoteRequestPurgeRepository,
    private readonly purger: QuoteRequestPurger,
  ) {}

  /** null = nada encerrado (ja respondido, expirado, fora do alvo ou evento nao commitado). */
  async close(
    input: CloseQuoteRequestInput,
  ): Promise<QuoteRequestCloseResult | null> {
    const claim = await this.purgeRepo.closeAndClaim(input);
    if (!claim) return null;

    let purged = false;
    try {
      purged = await this.purger.purge(claim);
    } catch (error) {
      const code = toPurgeErrorCode(error);
      try {
        await this.purgeRepo.recordPurgeFailure(claim.orgId, claim.id, code);
      } catch (recordError) {
        this.logger.warn(
          `Falha ao registrar erro de purga do pedido ${claim.id} (org ${claim.orgId}): ${toPurgeErrorCode(recordError)}`,
        );
      }
      this.logger.warn(
        `Purga imediata falhou para o pedido ${claim.id} (org ${claim.orgId}, outcome ${input.outcome}): ${code}`,
      );
    }

    return {
      contactRetained: claim.scope === QUOTE_PURGE_SCOPE.IMAGES,
      purged,
    };
  }

  /**
   * Registra o encerramento para depois do COMMIT da sessao. O hook RETORNA a promise
   * para o runWithClaims aguarda-la: a resposta HTTP so sai apos o encerramento. Nunca
   * relanca (erro de hook so e logado). A prova de commit e o EXISTS do evento no UPDATE.
   */
  closeAfterCommit(
    input: CloseQuoteRequestInput,
    onClosed?: (result: QuoteRequestCloseResult) => void | Promise<void>,
  ): void {
    registerPostCommit(() => this.closeSafely(input, onClosed));
  }

  private async closeSafely(
    input: CloseQuoteRequestInput,
    onClosed?: (result: QuoteRequestCloseResult) => void | Promise<void>,
  ): Promise<void> {
    try {
      const result = await this.close(input);
      if (!result) {
        this.logger.warn(
          `Encerramento ignorado: pedido ${input.id} (org ${input.orgId}) ja respondido ou evento nao commitado`,
        );
        return;
      }
      if (onClosed) await onClosed(result);
    } catch (error) {
      this.logger.warn(
        `Falha ao encerrar o pedido ${input.id} (org ${input.orgId}, outcome ${input.outcome}): ${error instanceof Error ? error.name : "UnknownError"}`,
      );
    }
  }
}
