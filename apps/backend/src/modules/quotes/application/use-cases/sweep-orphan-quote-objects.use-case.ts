import { Inject, Injectable, Logger } from "@nestjs/common";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import {
  CRON_JOB_STATE_REPOSITORY,
  ICronJobStateRepository,
} from "../../../../common/cron/cron-job-state.repository.interface";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import {
  IQuoteRequestPurgeRepository,
  QUOTE_REQUEST_PURGE_REPOSITORY,
} from "../../domain/quote-request-purge.repository.interface";
import {
  QUOTE_ORPHAN_MIN_AGE_MS,
  QUOTE_ORPHAN_SWEEP_INTERVAL_MS,
  QUOTE_ORPHAN_SWEEP_MAX_REMOVALS,
  QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS,
  toPurgeErrorCode,
} from "../../domain/quote-request-lifecycle";
import { QUOTE_REQUEST_IMAGES_BUCKET } from "./submit-quote-request.use-case";

const JOB_NAME: string = CRON_JOBS.QUOTE_ORPHAN_SWEEP;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Minusculo de proposito: ids sao gerados por randomUUID() e o Postgres devolve
// minusculo; uma pasta em outra caixa nao casaria com o banco e viraria "orfa".

export interface SweepOrphanQuoteObjectsResult {
  skipped?: "throttled";
  orgs: number;
  orphanRequests: number;
  removed: number;
  failed: number;
  truncated: boolean;
}

/**
 * Rede de seguranca do storage: remove objetos de `quote-request-images` cujo par
 * (org, pedido) nao existe mais no banco (upload de submit que falhou, purga
 * antiga, org removida). Self-throttled (claimRun, 6h) e SEM kill-switch: nao
 * depende de PUBLIC_QUOTE_FORM_ENABLED.
 *
 * Seguranca, em ordem de importancia:
 *  - consulta ao banco que FALHA nunca vira "nenhum pedido existe": a org e pulada;
 *  - so remove arquivos com createdAt conhecido e idade >= 24h (nao corre com um
 *    submit em andamento, que sobe os arquivos antes de gravar a linha);
 *  - pastas fora do formato UUID sao ignoradas e nunca removidas;
 *  - teto de remocoes por execucao (truncated).
 * Limitacoes conhecidas: a listagem e ordenada por nome e cortada no teto de
 * pastas por org, e o percorrimento sempre comeca do inicio — orfaos alem do
 * teto (ou de orgs apos o teto de remocoes) podem sofrer starvation enquanto os
 * primeiros nao forem limpos; `truncated` sinaliza isso. `removed` e a contagem
 * de paths SOLICITADOS ao removeFiles (o provider nao informa quais existiam).
 * Logs: so contagens, nunca paths, ids ou PII.
 */
@Injectable()
export class SweepOrphanQuoteObjectsUseCase {
  private readonly logger = new Logger(SweepOrphanQuoteObjectsUseCase.name);

  constructor(
    @Inject(CRON_JOB_STATE_REPOSITORY)
    private readonly cronState: ICronJobStateRepository,
    @Inject(QUOTE_REQUEST_PURGE_REPOSITORY)
    private readonly purgeRepo: IQuoteRequestPurgeRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async execute(
    now: Date = new Date(),
  ): Promise<SweepOrphanQuoteObjectsResult> {
    const result: SweepOrphanQuoteObjectsResult = {
      orgs: 0,
      orphanRequests: 0,
      removed: 0,
      failed: 0,
      truncated: false,
    };

    const claimed = await this.cronState.claimRun(
      JOB_NAME,
      now,
      QUOTE_ORPHAN_SWEEP_INTERVAL_MS,
    );
    if (!claimed) return { ...result, skipped: "throttled" };

    const { ids: orgIds } = await this.listUuidFolders("");
    for (const orgId of orgIds) {
      if (result.removed >= QUOTE_ORPHAN_SWEEP_MAX_REMOVALS) {
        result.truncated = true;
        break;
      }
      result.orgs += 1;
      try {
        await this.sweepOrg(orgId, now, result);
      } catch (error) {
        result.failed += 1;
        this.logger.warn(
          `quote orphan sweep: org skipped code=${toPurgeErrorCode(error)}`,
        );
      }
    }

    this.logger.log(
      `quote orphan sweep: orgs=${result.orgs} orphanRequests=${result.orphanRequests} removed=${result.removed} failed=${result.failed} truncated=${result.truncated}`,
    );
    return result;
  }

  private async sweepOrg(
    orgId: string,
    now: Date,
    result: SweepOrphanQuoteObjectsResult,
  ): Promise<void> {
    const { ids: requestIds, rawCount } = await this.listUuidFolders(
      orgId,
      QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS,
    );
    // Contagem BRUTA (antes do filtro UUID): entradas nao-UUID tambem consomem o teto.
    if (rawCount >= QUOTE_ORPHAN_SWEEP_MAX_REQUEST_FOLDERS) {
      result.truncated = true;
    }
    if (requestIds.length === 0) return;

    // Se a consulta falhar o erro sobe e a org inteira e pulada (nunca "vazio").
    const existing = await this.purgeRepo.findExistingRequestIds(
      orgId,
      requestIds,
    );
    const orphans = requestIds.filter((id) => !existing.has(id));

    for (const requestId of orphans) {
      if (result.removed >= QUOTE_ORPHAN_SWEEP_MAX_REMOVALS) {
        result.truncated = true;
        return;
      }
      result.orphanRequests += 1;
      try {
        result.removed += await this.removeOldFiles(orgId, requestId, now, result);
      } catch (error) {
        result.failed += 1;
        this.logger.warn(
          `quote orphan sweep: request skipped code=${toPurgeErrorCode(error)}`,
        );
      }
    }
  }

  private async removeOldFiles(
    orgId: string,
    requestId: string,
    now: Date,
    result: SweepOrphanQuoteObjectsResult,
  ): Promise<number> {
    // Lista o nivel INTEIRO antes de remover qualquer coisa.
    const entries = await this.storage.listObjects(
      QUOTE_REQUEST_IMAGES_BUCKET,
      `${orgId}/${requestId}`,
    );
    const eligible = entries
      .filter(
        (entry) =>
          entry.kind === "file" &&
          entry.createdAt !== null &&
          now.getTime() - entry.createdAt.getTime() >= QUOTE_ORPHAN_MIN_AGE_MS,
      )
      .map((entry) => entry.path);

    const budget = QUOTE_ORPHAN_SWEEP_MAX_REMOVALS - result.removed;
    if (eligible.length > budget) result.truncated = true;
    const paths = eligible.slice(0, Math.max(budget, 0));
    if (paths.length === 0) return 0;

    await this.storage.removeFiles(QUOTE_REQUEST_IMAGES_BUCKET, paths);
    return paths.length;
  }

  private async listUuidFolders(
    prefix: string,
    maxEntries?: number,
  ): Promise<{ ids: string[]; rawCount: number }> {
    const entries = await this.storage.listObjects(
      QUOTE_REQUEST_IMAGES_BUCKET,
      prefix,
      maxEntries ? { maxEntries } : undefined,
    );
    const ids = entries
      .filter((entry) => entry.kind === "folder" && UUID_PATTERN.test(entry.name))
      .map((entry) => entry.name);
    return { ids, rawCount: entries.length };
  }
}
