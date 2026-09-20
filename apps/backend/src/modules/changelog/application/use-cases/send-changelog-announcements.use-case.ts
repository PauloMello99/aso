import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import {
  CRON_JOB_STATE_REPOSITORY,
  ICronJobStateRepository,
} from "../../../../common/cron/cron-job-state.repository.interface";
import { EmailAllowlistService } from "../../../mail/application/email-allowlist.service";
import { MailService } from "../../../mail/application/mail.service";
import { getNotifiableEntries } from "../../domain/changelog-entries";
import {
  CHANGELOG_NOTIFICATION_REPOSITORY,
  IChangelogNotificationRepository,
} from "../../domain/changelog-notification.repository.interface";
import {
  CHANGELOG_TARGET_REPOSITORY,
  IChangelogTargetRepository,
} from "../../domain/changelog-target.repository.interface";
import { redactDeliveryError } from "../../domain/redact-delivery-error";

const JOB_NAME: string = CRON_JOBS.CHANGELOG_ANNOUNCEMENTS;
// Janela CURTA de propósito: o claim aqui serve para SERIALIZAR ticks
// sobrepostos (o UNIQUE (user_id, entry_id) só garante idempotência de linha,
// não impede dois ticks de enviarem o mesmo e-mail antes de gravar), não para
// limitar a 1 execução/dia. Com 10 min o próximo tick já pode drenar o que o
// cap por tick (MAX_SENDS_PER_TICK) deixou para trás.
const CLAIM_WINDOW_MS = 10 * 60 * 1000;
// Teto de ENVIOS (sent + failed) por tick; alvos bloqueados não consomem.
const MAX_SENDS_PER_TICK = 50;
// Limite de VARREDURA por item: alvos bloqueados pela allowlist não deixam
// rastro e voltam na mesma página a cada tick; buscar só `remaining` poderia
// esconder um dono permitido atrás de >cap bloqueados (starvation em staging).
const MAX_SCAN_PER_ENTRY = 500;
// Política de recência: ver docstring do use-case.
export const ANNOUNCEMENT_RECENCY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SendChangelogAnnouncementsResult {
  entriesProcessed: number;
  sent: number;
  failed: number;
  blocked: number;
  skippedReason?: string;
}

/**
 * Job cross-org do aviso de novidades por e-mail (ADR-0031/0030). Para cada
 * item notificável do registry (mais antigo primeiro) busca os owners ainda
 * não avisados e envia via `MailService.sendProductUpdate`, gravando UMA linha
 * terminal em `changelog_notifications` por alvo.
 *
 * Falha é TERMINAL: `recordFailed` grava a linha e o dedupe (UNIQUE
 * user_id+entry_id, aplicado em `findOwnersToNotify`) impede novo envio — sem
 * retry deliberado; duplicata só é possível se a gravação do log falhar após o
 * envio (entrega at-least-once nesse caso).
 *
 * JANELA DE RECÊNCIA (ANNOUNCEMENT_RECENCY_DAYS = 30): só itens com
 * `publishedAt` nos últimos 30 dias em relação ao "agora" do tick são
 * processados; os mais antigos são ignorados (sem log). Sem isso, quem passa a
 * ser elegível depois (dono promovido, opt-out revertido, org que sai de
 * suspensão) receberia TODO o histórico de releases. Consequência: esses
 * usuários recebem no máximo os releases dos últimos 30 dias.
 *
 * Allowlist checada por ALVO antes de enviar E antes de gravar qualquer linha:
 * `MailService` devolve `false` quando o sender bloqueia, o que seria gravado
 * como falha e queimaria o dedupe do dono real em produção. Alvo bloqueado
 * não deixa rastro; é re-selecionado a cada tick (barulho de log aceito).
 *
 * Gates de flag e canal rodam ANTES do claim para não consumir a janela à toa.
 */
@Injectable()
export class SendChangelogAnnouncementsUseCase {
  private readonly logger = new Logger(SendChangelogAnnouncementsUseCase.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(CHANGELOG_TARGET_REPOSITORY)
    private readonly targetRepo: IChangelogTargetRepository,
    @Inject(CHANGELOG_NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: IChangelogNotificationRepository,
    @Inject(CRON_JOB_STATE_REPOSITORY)
    private readonly cronJobStateRepo: ICronJobStateRepository,
    private readonly mail: MailService,
    private readonly allowlist: EmailAllowlistService,
  ) {}

  async execute(
    now: Date = new Date(),
  ): Promise<SendChangelogAnnouncementsResult> {
    const skipped = (
      skippedReason: string,
    ): SendChangelogAnnouncementsResult => ({
      entriesProcessed: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
      skippedReason,
    });

    // Gate A — kill-switch (default off).
    const enabled = this.config.get<string>("CHANGELOG_ANNOUNCEMENTS_ENABLED");
    if (enabled !== "true") {
      return skipped("disabled");
    }

    // Gate B — canal de e-mail (mesmo cálculo do run-campaign-triggers).
    const emailFlag =
      this.config.get<string>("NOTIFICATIONS_EMAIL_ENABLED") === "true";
    const apiKey = this.config.get<string>("RESEND_API_KEY") ?? "";
    if (!emailFlag || apiKey.length === 0) {
      this.logger.log(
        "Canal de e-mail desligado — no-op (não reivindica o tick).",
      );
      return skipped("email_channel_off");
    }

    // Gate C — serialização do tick.
    const claimed = await this.cronJobStateRepo.claimRun(
      JOB_NAME,
      now,
      CLAIM_WINDOW_MS,
    );
    if (!claimed) return skipped("already_ran");

    // `publishedAt` é data pura (YYYY-MM-DD ⇒ 00:00 UTC); borda de 30 dias inclusiva.
    const recencyCutoffMs = now.getTime() - ANNOUNCEMENT_RECENCY_DAYS * DAY_MS;
    const entries = [...getNotifiableEntries()]
      .filter((entry) => new Date(entry.publishedAt).getTime() >= recencyCutoffMs)
      .sort((a, b) => a.version - b.version);

    let entriesProcessed = 0;
    let sent = 0;
    let failed = 0;
    let blocked = 0;

    for (const entry of entries) {
      if (sent + failed >= MAX_SENDS_PER_TICK) break;

      const targets = await this.targetRepo.findOwnersToNotify(
        entry.id,
        entry.publishedAt,
        MAX_SCAN_PER_ENTRY,
      );
      entriesProcessed += 1;

      for (const target of targets) {
        if (sent + failed >= MAX_SENDS_PER_TICK) break;

        // Gate de allowlist ANTES de enviar e de gravar qualquer linha.
        if (!this.allowlist.isAllowed(target.email)) {
          blocked += 1;
          this.logger.warn(
            `Aviso de novidades ${entry.id} bloqueado pela allowlist de e-mail para o usuário ${target.userId}`,
          );
          continue;
        }

        let delivered = false;
        let failure: unknown = "send_returned_false";
        try {
          delivered = await this.mail.sendProductUpdate({
            to: target.email,
            name: target.name,
            semver: entry.semver,
            title: entry.title,
            summary: entry.summary,
            highlights: entry.highlights,
          });
        } catch (error) {
          failure = error;
        }

        try {
          if (delivered) {
            await this.notificationRepo.recordSent(target.userId, entry.id);
          } else {
            await this.notificationRepo.recordFailed(
              target.userId,
              entry.id,
              redactDeliveryError(failure),
            );
          }
        } catch {
          // Sem PII: nem a mensagem do erro (pode ecoar dados) vai para o log.
          this.logger.warn(
            `Registro do aviso ${entry.id} não gravado para o usuário ${target.userId}`,
          );
        }

        if (delivered) sent += 1;
        else failed += 1;
      }
    }

    this.logger.log(
      `Avisos de novidades: entries=${entriesProcessed} sent=${sent} failed=${failed} blocked=${blocked}`,
    );
    return { entriesProcessed, sent, failed, blocked };
  }
}
