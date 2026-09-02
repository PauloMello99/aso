import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import {
  CRON_JOB_STATE_REPOSITORY,
  ICronJobStateRepository,
} from "../../../../common/cron/cron-job-state.repository.interface";
import { resolveCampaignCopy } from "../../domain/campaign-copy";
import {
  CAMPAIGN_MAILER,
  ICampaignMailer,
} from "../../domain/campaign-mailer.port";
import {
  CAMPAIGN_SEND_REPOSITORY,
  ICampaignSendRepository,
  RecordCampaignSendInput,
} from "../../domain/campaign-send.repository.interface";
import {
  CAMPAIGN_TARGET_REPOSITORY,
  CampaignTarget,
  ICampaignTargetRepository,
} from "../../domain/campaign-target.repository.interface";
import {
  CAMPAIGN_TRIGGERS,
  CampaignTrigger,
} from "../../domain/campaign-trigger";
import {
  CUSTOMER_EMAIL_PREFERENCE_REPOSITORY,
  ICustomerEmailPreferenceRepository,
} from "../../domain/customer-email-preference.repository.interface";
import { redactEmail } from "../../domain/redact-email";

const JOB_NAME: string = CRON_JOBS.CAMPAIGN_TRIGGERS;
// Self-throttle: ~1x/dia com folga sobre um tick horário, sem depender de um
// @Cron do Nest — invocado em todo /internal/cron/tick como os demais jobs, mas
// a maioria das chamadas é um claim barato que retorna false.
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const MAX_TARGETS_PER_TRIGGER = 200;
const MAX_RETRIES_PER_RUN = 100;
const POST_SERVICE_SINCE_HOURS = 48;
const POST_SERVICE_UNTIL_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

export interface RunCampaignTriggersResult {
  skipped: boolean;
  reason?: string;
  sent: number;
  failed: number;
  retried: number;
}

/**
 * Job cross-org de campanhas de e-mail por gatilho (T6 Bloco A). Para cada
 * gatilho de `CAMPAIGN_TRIGGERS` busca os alvos elegíveis (opt-out, org
 * suspensa e dedupe já aplicados em SQL pelos helpers de `CampaignTarget`),
 * envia via `ICampaignMailer` e grava UMA linha terminal em `campaign_sends`
 * por tentativa (append-only, D2 — `bounced` é escrito só por webhook futuro,
 * nunca aqui). Exceção: se a ENTREGA tem sucesso mas o INSERT da linha `sent`
 * falha, nenhuma linha é gravada e o job só loga — nunca marca `failed` um
 * e-mail já entregue. Consequência: o dedupe re-seleciona o alvo no próximo run
 * (duplicata possível, preferível a marcar `failed` um e-mail entregue e o
 * `findRetriable` reenviá-lo).
 *
 * O passe de retry roda ANTES do loop principal de propósito: ele processa as
 * linhas `failed` do run ANTERIOR, que têm ~20h de espaçamento natural (a janela
 * do self-throttle) — rodá-lo depois do loop re-tentaria as falhas recém-criadas
 * no mesmo tick, sem backoff.
 *
 * Self-throttled via `ICronJobStateRepository.claimRun` (claim atômico no
 * banco), não um `@Cron`. Os gates de flag e canal de e-mail rodam ANTES do
 * claim de propósito: `ICampaignMailer.sendCampaign` é no-op silencioso com o
 * canal desligado, então um lote nessa condição gravaria a linha `sent` e
 * queimaria o `dedupe_key` sem entregar nada — e reivindicar o tick antes
 * consumiria a janela de 20h à toa.
 */
@Injectable()
export class RunCampaignTriggersUseCase {
  private readonly logger = new Logger(RunCampaignTriggersUseCase.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(CAMPAIGN_TARGET_REPOSITORY)
    private readonly targetRepo: ICampaignTargetRepository,
    @Inject(CAMPAIGN_SEND_REPOSITORY)
    private readonly sendRepo: ICampaignSendRepository,
    @Inject(CUSTOMER_EMAIL_PREFERENCE_REPOSITORY)
    private readonly prefRepo: ICustomerEmailPreferenceRepository,
    @Inject(CAMPAIGN_MAILER)
    private readonly mailer: ICampaignMailer,
    @Inject(CRON_JOB_STATE_REPOSITORY)
    private readonly cronJobStateRepo: ICronJobStateRepository,
  ) {}

  async execute(): Promise<RunCampaignTriggersResult> {
    const now = new Date();

    // Gate a — kill-switch global.
    if (this.config.get<string>("CAMPAIGNS_ENABLED") !== "true") {
      this.logger.log("Campanhas desabilitadas (CAMPAIGNS_ENABLED) — no-op.");
      return {
        skipped: true,
        reason: "flag_disabled",
        sent: 0,
        failed: 0,
        retried: 0,
      };
    }

    // Gate b — canal de e-mail. Espelha o cálculo do `ResendEmailSender`.
    const emailFlag =
      this.config.get<string>("NOTIFICATIONS_EMAIL_ENABLED") === "true";
    const apiKey = this.config.get<string>("RESEND_API_KEY") ?? "";
    if (!emailFlag || apiKey.length === 0) {
      this.logger.log(
        "Canal de e-mail desligado — no-op (não reivindica o tick).",
      );
      return {
        skipped: true,
        reason: "email_channel_disabled",
        sent: 0,
        failed: 0,
        retried: 0,
      };
    }

    // Gate c — claim atômico do self-throttle.
    const claimed = await this.cronJobStateRepo.claimRun(
      JOB_NAME,
      now,
      MIN_INTERVAL_MS,
    );
    if (!claimed) {
      return {
        skipped: true,
        reason: "throttled",
        sent: 0,
        failed: 0,
        retried: 0,
      };
    }

    // referenceDate (D8): dia-calendário em America/Sao_Paulo fixado como um
    // `Date` à meia-noite UTC. O use-case não roda SQL, então o fuso é resolvido
    // com `Intl.DateTimeFormat`; os helpers de gatilho consomem esse `Date` via
    // `toUtcDateString`. `since`/`until` do post-service são janelas de tempo
    // absoluto (não dependem de fuso).
    const saoPauloDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const referenceDate = new Date(`${saoPauloDay}T00:00:00Z`);
    const since = new Date(now.getTime() - POST_SERVICE_SINCE_HOURS * HOUR_MS);
    const until = new Date(now.getTime() - POST_SERVICE_UNTIL_HOURS * HOUR_MS);

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );

    let sent = 0;
    let failed = 0;
    let retried = 0;

    // Passe de retry PRIMEIRO — linhas `failed` cuja última tentativa continua
    // sendo a falha e `attempt < MAX_ATTEMPTS`. Roda antes do loop principal de
    // propósito: assim só re-tenta falhas do run ANTERIOR (~20h de backoff
    // natural pela janela do self-throttle), nunca as que o loop abaixo acabou
    // de gravar. `findRetriable` já traz destinatário, nomes e overrides
    // (JOINs), então o reenvio não volta ao banco.
    const retriable = await this.sendRepo.findRetriable(
      MAX_ATTEMPTS,
      MAX_RETRIES_PER_RUN,
    );

    for (const row of retriable) {
      let delivered = false;
      try {
        const { unsubscribeToken } = await this.prefRepo.ensureForCustomer(
          row.customerId,
          row.orgId,
        );
        const unsubscribeUrl = `${frontendUrl}/preferencias-email/${unsubscribeToken}`;
        const { subject, body } = resolveCampaignCopy({
          trigger: row.trigger,
          subjectOverride: row.subjectOverride,
          body: row.body,
          customerName: row.customerName,
          orgName: row.orgName,
        });

        await this.mailer.sendCampaign({
          to: row.customerEmail,
          trigger: row.trigger,
          subject,
          body,
          customerName: row.customerName,
          orgName: row.orgName,
          unsubscribeUrl,
        });
        delivered = true;

        await this.sendRepo.record({
          orgId: row.orgId,
          customerId: row.customerId,
          trigger: row.trigger,
          dedupeKey: row.dedupeKey,
          attempt: row.attempt + 1,
          status: "sent",
        });
        retried += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (delivered) {
          // Retry ENTREGUE, só o INSERT `sent` falhou: não marcar `failed` um
          // e-mail que saiu. Não incrementa contador; o dedupe re-seleciona no
          // próximo run.
          this.logger.warn(
            `Retry de campanha ${row.trigger} entregue ao cliente ${row.customerId} (org ${row.orgId}), mas o registro 'sent' falhou: ${message}`,
          );
          continue;
        }
        await this.recordFailureSafe(
          {
            orgId: row.orgId,
            customerId: row.customerId,
            trigger: row.trigger,
            dedupeKey: row.dedupeKey,
            attempt: row.attempt + 1,
            status: "failed",
            error: redactEmail(message),
          },
          `retry de campanha ${row.trigger} do cliente ${row.customerId} (org ${row.orgId})`,
        );
        failed += 1;
        this.logger.warn(
          `Retry de campanha ${row.trigger} falhou para o cliente ${row.customerId} (org ${row.orgId}): ${message}`,
        );
      }
    }

    for (const trigger of CAMPAIGN_TRIGGERS) {
      const targets = await this.findTargets(trigger, {
        since,
        until,
        referenceDate,
      });

      if (targets.length === MAX_TARGETS_PER_TRIGGER) {
        // Teto global cross-org atingido. As queries de birthday/post_service
        // são atadas à data, então o excedente sai da janela e NÃO é
        // reprocessado — sinaliza possível perda de envio.
        this.logger.warn(
          `Gatilho ${trigger} atingiu o teto de ${MAX_TARGETS_PER_TRIGGER} alvos neste tick — o excedente sai da janela e não será reprocessado.`,
        );
      }

      for (const target of targets) {
        // try/catch INDIVIDUAL (best-effort, ADR-0012): um e-mail ruim não
        // derruba o lote. NÃO re-checa opt-out em memória — o filtro está no
        // SQL do helper que produziu `target`.
        let delivered = false;
        try {
          const { unsubscribeToken } = await this.prefRepo.ensureForCustomer(
            target.customerId,
            target.orgId,
          );
          const unsubscribeUrl = `${frontendUrl}/preferencias-email/${unsubscribeToken}`;
          const { subject, body } = resolveCampaignCopy({
            trigger,
            subjectOverride: target.subjectOverride,
            body: target.body,
            customerName: target.customerName,
            orgName: target.orgName,
          });

          await this.mailer.sendCampaign({
            to: target.customerEmail,
            trigger,
            subject,
            body,
            customerName: target.customerName,
            orgName: target.orgName,
            unsubscribeUrl,
          });
          delivered = true;

          await this.sendRepo.record({
            orgId: target.orgId,
            customerId: target.customerId,
            trigger,
            dedupeKey: target.dedupeKey,
            attempt: 1,
            status: "sent",
          });
          sent += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (delivered) {
            // Entrega OK, só o INSERT `sent` falhou: NÃO gravar `failed` (o
            // `findRetriable` casaria e reenviaria um e-mail já entregue). Não
            // incrementa contador; o dedupe re-seleciona no próximo run.
            this.logger.warn(
              `Campanha ${trigger} entregue ao cliente ${target.customerId} (org ${target.orgId}), mas o registro 'sent' falhou: ${message}`,
            );
            continue;
          }
          await this.recordFailureSafe(
            {
              orgId: target.orgId,
              customerId: target.customerId,
              trigger,
              dedupeKey: target.dedupeKey,
              attempt: 1,
              status: "failed",
              error: redactEmail(message),
            },
            `campanha ${trigger} do cliente ${target.customerId} (org ${target.orgId})`,
          );
          failed += 1;
          this.logger.warn(
            `Falha ao enviar campanha ${trigger} para o cliente ${target.customerId} (org ${target.orgId}): ${message}`,
          );
        }
      }
    }

    this.logger.log(
      `Campanhas (retry antes do loop): retried=${retried} sent=${sent} failed=${failed}`,
    );
    return { skipped: false, sent, failed, retried };
  }

  /**
   * Grava a linha `failed` num try/catch próprio: se o INSERT lançar (mesmo
   * problema de banco), só loga um warn e NÃO propaga — deixar a exceção
   * escapar de `execute()` abortaria o resto do lote DEPOIS do `claimRun` já
   * ter consumido a janela de 20h.
   */
  private async recordFailureSafe(
    input: RecordCampaignSendInput,
    context: string,
  ): Promise<void> {
    try {
      await this.sendRepo.record(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Registro de falha não gravado (${context}): ${message}`,
      );
    }
  }

  private findTargets(
    trigger: CampaignTrigger,
    windows: { since: Date; until: Date; referenceDate: Date },
  ): Promise<CampaignTarget[]> {
    switch (trigger) {
      case "post_service":
        return this.targetRepo.findPostServiceTargets({
          since: windows.since,
          until: windows.until,
          limit: MAX_TARGETS_PER_TRIGGER,
        });
      case "birthday":
        return this.targetRepo.findBirthdayTargets({
          referenceDate: windows.referenceDate,
          limit: MAX_TARGETS_PER_TRIGGER,
        });
      case "inactivity":
        return this.targetRepo.findInactivityTargets({
          referenceDate: windows.referenceDate,
          limit: MAX_TARGETS_PER_TRIGGER,
        });
    }
  }
}
