import { Inject, Injectable } from "@nestjs/common";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../auth/application/ports/storage-provider.interface";
import {
  IQuoteRequestPurgeRepository,
  QUOTE_REQUEST_PURGE_REPOSITORY,
  QuoteRequestPurgeClaim,
} from "../domain/quote-request-purge.repository.interface";
import { QUOTE_PURGE_SCOPE } from "../domain/quote-request-lifecycle";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./use-cases/submit-quote-request.use-case";

// Erros internos com name e mensagem FIXOS: o name vira o codigo de
// purge_last_error (toPurgeErrorCode); nunca carregam paths, ids ou PII.
export class QuotePurgeUnsafePathError extends Error {
  constructor() {
    super("Quote purge path outside request prefix");
    this.name = "QuotePurgeUnsafePathError";
  }
}

export class QuotePurgeResidualObjectsError extends Error {
  constructor() {
    super("Quote purge left residual storage objects");
    this.name = "QuotePurgeResidualObjectsError";
  }
}

/**
 * Purga UM pedido ja reivindicado (claim): remove os arquivos do storage, VERIFICA
 * que nada sobrou e so entao mexe no banco. A ordem importa: se o banco fosse
 * apagado primeiro, uma falha de storage deixaria objetos orfaos sem referencia.
 * Qualquer falha propaga (o chamador registra e a fila tenta de novo apos o lease).
 */
@Injectable()
export class QuoteRequestPurger {
  constructor(
    @Inject(QUOTE_REQUEST_PURGE_REPOSITORY)
    private readonly purgeRepo: IQuoteRequestPurgeRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  /** true quando a linha/fila foi de fato concluida; false se o claim foi perdido. */
  async purge(claim: QuoteRequestPurgeClaim): Promise<boolean> {
    const prefix = `${claim.orgId}/${claim.id}`;

    const dbPaths = await this.purgeRepo.listImagePaths(claim.orgId, claim.id);
    const listed = await this.listFiles(prefix);
    const paths = [...new Set([...dbPaths, ...listed])];

    // Nunca remover fora do prefixo do proprio pedido.
    if (paths.some((path) => !path.startsWith(`${prefix}/`))) {
      throw new QuotePurgeUnsafePathError();
    }

    if (paths.length > 0) {
      await this.storage.removeFiles(QUOTE_REQUEST_IMAGES_BUCKET, paths);
    }

    // Re-lista: so avanca para o banco com o storage comprovadamente vazio.
    // Falha fechado: QUALQUER entrada (arquivo ou pasta) e residuo.
    const remaining = await this.storage.listObjects(
      QUOTE_REQUEST_IMAGES_BUCKET,
      prefix,
    );
    if (remaining.length > 0) throw new QuotePurgeResidualObjectsError();

    if (claim.scope === QUOTE_PURGE_SCOPE.ALL) {
      return this.purgeRepo.deleteRequest(claim.orgId, claim.id);
    }
    return this.purgeRepo.completeImagePurge(
      claim.orgId,
      claim.id,
      claim.claimedAt,
    );
  }

  private async listFiles(prefix: string): Promise<string[]> {
    const entries = await this.storage.listObjects(
      QUOTE_REQUEST_IMAGES_BUCKET,
      prefix,
    );
    return entries
      .filter((entry) => entry.kind === "file")
      .map((entry) => entry.path);
  }
}
