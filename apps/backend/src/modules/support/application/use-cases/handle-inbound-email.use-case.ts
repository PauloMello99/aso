import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IInboundEmailClient,
  INBOUND_EMAIL_CLIENT,
  InboundEmailAttachmentRef,
} from "../../domain/ports/inbound-email.port";
import {
  IInboundEmailRepository,
  INBOUND_EMAIL_REPOSITORY,
} from "../../domain/inbound-email.repository.interface";
import {
  ITransactionRunner,
  TRANSACTION_RUNNER,
  TransactionContext,
} from "../../domain/ports/transaction-runner.port";
import {
  ITicketRepository,
  TICKET_REPOSITORY,
} from "../../domain/ticket.repository.interface";
import {
  ITicketResponseRepository,
  TICKET_RESPONSE_REPOSITORY,
} from "../../domain/ticket-response.repository.interface";
import {
  ITicketCategoryRepository,
  TICKET_CATEGORY_REPOSITORY,
} from "../../domain/ticket-category.repository.interface";
import {
  ITicketAttachmentRepository,
  TICKET_ATTACHMENT_REPOSITORY,
} from "../../domain/ticket-attachment.repository.interface";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../../../auth/application/ports/storage-provider.interface";
import { TicketEntity } from "../../domain/ticket.entity";
import { TicketResponseEntity } from "../../domain/ticket-response.entity";
import { computeSlaDueDates } from "../../domain/ticket-sla";
import { SupportNotificationService } from "../support-notification.service";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  TICKET_ATTACHMENT_BUCKET,
} from "./upload-ticket-attachment.use-case";

/**
 * Categoria de fallback para tickets órfãos criados a partir de e-mail sem
 * threading reconhecível — `system_key` confirmado no seed da migration
 * 0037 (`ticket_categories`). Se algum dia o seed remover "other", o código
 * cai no primeiro item de `listEnabled()` (ver abaixo) em vez de quebrar.
 */
const FALLBACK_CATEGORY_SYSTEM_KEY = "other";

/**
 * Plus-address de threading: `<local-part>+<ticketId (uuid)>@<domínio>`,
 * gerado por `SupportNotificationService.inboundReplyTo`.
 */
const PLUS_ADDRESS_RE =
  /^([a-z0-9._-]+)\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const SUBJECT_FALLBACK = "(sem assunto)";
const SUBJECT_MAX = 200;
// Espelha SUBJECT_MIN_LENGTH de ticket.entity.ts (não exportado) — abaixo
// desse tamanho, TicketEntity.create lançaria, então tratamos como "vazio".
const SUBJECT_MIN_FOR_NORMALIZATION = 5;

const BODY_FALLBACK = "(mensagem sem conteúdo textual)";
const BODY_MAX = 5000;
const BODY_TRUNCATION_SUFFIX = " [...] (mensagem truncada)";
// Espelha DESCRIPTION_MIN_LENGTH de ticket.entity.ts — maior que o mínimo de
// TicketResponseEntity (1), então cobre os dois casos com folga.
const BODY_MIN_FOR_NORMALIZATION = 10;

interface ParsedAddress {
  email: string;
  name: string | null;
}

/** Aceita "Nome <a@b.com>" ou "a@b.com" puro. */
function parseAddrSpec(raw: string): ParsedAddress {
  const match = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    const rawName = match[1]!.trim().replace(/^"|"$/g, "");
    return {
      email: match[2]!.trim(),
      name: rawName.length > 0 ? rawName : null,
    };
  }
  return { email: raw.trim(), name: null };
}

function extractTicketIdFromPlusAddress(email: string): string | null {
  const at = email.indexOf("@");
  if (at === -1) return null;
  const localPart = email.slice(0, at);
  const match = localPart.match(PLUS_ADDRESS_RE);
  return match ? match[2]! : null;
}

/** Conversão simples HTML -> texto (sem parser completo, ver escopo). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeSubject(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < SUBJECT_MIN_FOR_NORMALIZATION) return SUBJECT_FALLBACK;
  if (trimmed.length > SUBJECT_MAX) return trimmed.slice(0, SUBJECT_MAX);
  return trimmed;
}

function normalizeBody(text: string | null, html: string | null): string {
  const source = text ?? (html ? htmlToText(html) : null);
  const trimmed = (source ?? "").trim();
  if (trimmed.length < BODY_MIN_FOR_NORMALIZATION) return BODY_FALLBACK;
  if (trimmed.length > BODY_MAX) {
    return (
      trimmed.slice(0, BODY_MAX - BODY_TRUNCATION_SUFFIX.length) +
      BODY_TRUNCATION_SUFFIX
    );
  }
  return trimmed;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.-]+/g, "_").slice(-100);
}

export interface HandleInboundEmailOutcome {
  /** `false` = e-mail já processado antes (retry do webhook), nada feito. */
  claimed: boolean;
  ticketId: string | null;
  responseId: string | null;
  outcome: string | null;
}

interface TransactionResult {
  claimed: boolean;
  ticket: TicketEntity | null;
  response: TicketResponseEntity | null;
  isNewTicket: boolean;
  reopened: boolean;
  outcome: string | null;
}

/**
 * Processa um e-mail recebido pelo webhook Resend (assinatura já verificada
 * no controller): idempotente via `support_inbound_emails`, faz threading
 * por plus-address (com verificação obrigatória do remetente) e cria ou
 * atualiza o ticket/resposta correspondente dentro de uma única transação
 * DRIZZLE_ADMIN junto com o claim de idempotência e a persistência dos
 * anexos. Listagem/validação/download de anexos (Fase 1) roda ANTES da
 * transação — só o upload pro Storage + metadado (Fase 2) roda dentro dela,
 * sem try/catch por item: falha real de infraestrutura aborta a transação
 * inteira (ver achado do database-guardian sobre 25P02/transação abortada).
 */
@Injectable()
export class HandleInboundEmailUseCase {
  private readonly logger = new Logger(HandleInboundEmailUseCase.name);

  constructor(
    @Inject(INBOUND_EMAIL_CLIENT)
    private readonly emailClient: IInboundEmailClient,
    @Inject(INBOUND_EMAIL_REPOSITORY)
    private readonly inboundEmailRepo: IInboundEmailRepository,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: ITransactionRunner,
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepo: ITicketRepository,
    @Inject(TICKET_RESPONSE_REPOSITORY)
    private readonly responseRepo: ITicketResponseRepository,
    @Inject(TICKET_CATEGORY_REPOSITORY)
    private readonly categoryRepo: ITicketCategoryRepository,
    @Inject(TICKET_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: ITicketAttachmentRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
    private readonly notifications: SupportNotificationService,
  ) {}

  async execute(
    emailId: string,
    messageId: string | null,
  ): Promise<HandleInboundEmailOutcome> {
    const body = await this.emailClient.getReceivedEmail(emailId);
    const fromParsed = parseAddrSpec(body.from);

    // Fase 1 (fora da transação): rede + validação, sem nenhuma escrita em
    // banco. Anexos inválidos/com falha de download são descartados aqui —
    // o que sobra em `prepared` já foi baixado com sucesso, então a Fase 2
    // (dentro da transação) só falha por erro real de infraestrutura.
    const { prepared: preparedAttachments, total: totalAttachments } =
      await this.prepareAttachments(emailId);

    const txResult = await this.transactionRunner.run<TransactionResult>(
      async (tx) => {
        const claimed = await this.inboundEmailRepo.claim(
          {
            emailId,
            messageId,
            fromEmail: fromParsed.email,
            // Coluna é single-valued; múltiplos destinatários (raro em
            // e-mail transacional de suporte) colapsam no primeiro — só
            // usado para dedupe/log, não para lógica de negócio.
            toEmail: body.to[0] ?? "",
          },
          tx,
        );
        if (!claimed) {
          return {
            claimed: false,
            ticket: null,
            response: null,
            isNewTicket: false,
            reopened: false,
            outcome: null,
          };
        }

        const linkedTicket = await this.findLinkedTicket(
          body.to,
          fromParsed.email,
          tx,
        );

        const now = new Date();
        const outcomeParts: string[] = [];
        let ticket: TicketEntity;
        let response: TicketResponseEntity | null = null;
        let reopened = false;

        if (linkedTicket) {
          response = TicketResponseEntity.create({
            id: randomUUID(),
            ticketId: linkedTicket.id,
            orgId: linkedTicket.orgId,
            authorType: "customer",
            authorUserId: null,
            body: normalizeBody(body.text, body.html),
            isInternalNote: false,
            createdAt: now,
          });

          let updatedTicket = linkedTicket;
          if (
            linkedTicket.status === "resolved" ||
            linkedTicket.status === "closed"
          ) {
            // Auto-reopen: diferente do portal (TicketNotReopenableException),
            // e-mail para ticket fechado reabre em vez de bloquear.
            const category = await this.categoryRepo.findById(
              linkedTicket.categoryId,
            );
            updatedTicket = linkedTicket.reopen(now);
            if (category) {
              updatedTicket = updatedTicket.resetResolutionSla(
                computeSlaDueDates(now, category).slaResolutionDueAt,
                now,
              );
            }
            reopened = true;
            outcomeParts.push("ticket_reopened");
          } else if (linkedTicket.status === "waiting_customer") {
            updatedTicket = linkedTicket.markInProgress(now);
          }

          if (updatedTicket !== linkedTicket) {
            updatedTicket = await this.ticketRepo.updateAsAdmin(
              updatedTicket,
              tx,
            );
          }

          response = await this.responseRepo.createAsAdmin(response, tx);
          outcomeParts.push("response_added");
          ticket = updatedTicket;
        } else {
          const categories = await this.categoryRepo.listEnabled();
          const category =
            categories.find(
              (c) => c.systemKey === FALLBACK_CATEGORY_SYSTEM_KEY,
            ) ?? categories[0];
          if (!category) {
            throw new Error(
              "Nenhuma categoria de ticket habilitada disponível para processar e-mail órfão",
            );
          }

          const { slaFirstResponseDueAt, slaResolutionDueAt } =
            computeSlaDueDates(now, category);

          const newTicket = TicketEntity.create({
            id: randomUUID(),
            orgId: null,
            categoryId: category.id,
            createdBy: null,
            requesterName: fromParsed.name ?? fromParsed.email,
            requesterEmail: fromParsed.email,
            subject: normalizeSubject(body.subject),
            description: normalizeBody(body.text, body.html),
            priority: "normal",
            slaFirstResponseDueAt,
            slaResolutionDueAt,
            createdAt: now,
            updatedAt: now,
          });

          ticket = await this.ticketRepo.createAsAdmin(newTicket, tx);
          outcomeParts.push("ticket_created");
        }

        // Fase 2 (dentro da transação): upload pro Storage + persistência do
        // metadado, sem try/catch por item — falha real aqui (storage/banco)
        // deve propagar e abortar a transação inteira (rollback do claim +
        // ticket + tudo), fazendo o e-mail inteiro falhar e ser reprocessado
        // no retry, em vez de silenciar e deixar o resto quebrado.
        const uploaded = await this.persistAttachments(
          preparedAttachments,
          ticket,
          response,
          tx,
        );

        const outcome = `${outcomeParts.join("+")};att=${uploaded}/${totalAttachments}`;

        await this.inboundEmailRepo.markProcessed(
          emailId,
          {
            ticketId: ticket.id,
            responseId: response?.id ?? null,
            outcome,
          },
          tx,
        );

        return {
          claimed: true,
          ticket,
          response,
          isNewTicket: !linkedTicket,
          reopened,
          outcome,
        };
      },
    );

    if (!txResult.claimed || !txResult.ticket) {
      return {
        claimed: false,
        ticketId: null,
        responseId: null,
        outcome: null,
      };
    }

    // Best-effort, fora da transação (ADR-0012): falha de e-mail nunca
    // desfaz o processamento já commitado.
    if (txResult.isNewTicket) {
      await this.notifications.notifyTicketCreated(txResult.ticket);
    } else if (txResult.reopened) {
      await this.notifications.notifyReopened(txResult.ticket);
    }

    return {
      claimed: true,
      ticketId: txResult.ticket.id,
      responseId: txResult.response?.id ?? null,
      outcome: txResult.outcome,
    };
  }

  /**
   * Threading por plus-address: casa cada destinatário contra o padrão
   * `local+<uuid>@dominio`, busca o ticket candidato e SÓ o aceita se o
   * remetente do e-mail bater (case-insensitive) com `requesterEmail` do
   * ticket — nunca confia em plus-address sem essa verificação.
   */
  private async findLinkedTicket(
    to: string[],
    fromEmail: string,
    tx: TransactionContext,
  ): Promise<TicketEntity | null> {
    for (const toAddress of to) {
      const toEmail = parseAddrSpec(toAddress).email;
      const ticketId = extractTicketIdFromPlusAddress(toEmail);
      if (!ticketId) continue;

      const candidate = await this.ticketRepo.findByIdAsAdmin(ticketId, tx);
      if (
        candidate &&
        candidate.requesterEmail.toLowerCase() === fromEmail.toLowerCase()
      ) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Fase 1 (fora da transação de banco): lista os anexos, descarta os
   * inválidos (tamanho/mime type) e baixa o conteúdo dos demais. Nunca
   * lança — anexo inválido ou com falha de download só é descartado (mesmo
   * log de antes); o que sobra em `prepared` já passou por toda validação
   * e já foi baixado com sucesso, então a Fase 2 só falha por erro real de
   * infraestrutura (storage/banco), não por "conteúdo inválido".
   */
  private async prepareAttachments(emailId: string): Promise<{
    prepared: { ref: InboundEmailAttachmentRef; buffer: Buffer }[];
    total: number;
  }> {
    const attachments = await this.emailClient.listAttachments(emailId);
    const prepared: { ref: InboundEmailAttachmentRef; buffer: Buffer }[] = [];

    for (const attachment of attachments) {
      if (attachment.sizeBytes > MAX_FILE_SIZE_BYTES) {
        this.logger.warn(
          `Anexo descartado (tamanho > ${MAX_FILE_SIZE_BYTES} bytes): emailId=${emailId} fileName=${attachment.fileName} mimeType=${attachment.mimeType} size=${attachment.sizeBytes}`,
        );
        continue;
      }
      if (!ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
        this.logger.warn(
          `Anexo descartado (mime type não permitido): emailId=${emailId} fileName=${attachment.fileName} mimeType=${attachment.mimeType} size=${attachment.sizeBytes}`,
        );
        continue;
      }

      try {
        const buffer = await this.emailClient.downloadAttachment(attachment);
        prepared.push({ ref: attachment, buffer });
      } catch (err) {
        this.logger.warn(
          `Falha ao baixar anexo: emailId=${emailId} fileName=${attachment.fileName}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { prepared, total: attachments.length };
  }

  /**
   * Fase 2 (dentro da transação de banco): upload pro Storage + persistência
   * do metadado de cada anexo já preparado pela Fase 1 — SEM try/catch
   * individual. Se algo falhar aqui, a exceção propaga e aborta a transação
   * inteira (rollback do claim + ticket + tudo): esse é o comportamento
   * correto para falha real de infraestrutura, que deve fazer o e-mail
   * inteiro falhar e ser reprocessado no retry.
   */
  private async persistAttachments(
    prepared: { ref: InboundEmailAttachmentRef; buffer: Buffer }[],
    ticket: TicketEntity,
    response: TicketResponseEntity | null,
    tx: TransactionContext,
  ): Promise<number> {
    for (const { ref, buffer } of prepared) {
      const storagePath = `${ticket.orgId ?? "orphan"}/${ticket.id}/${randomUUID()}-${sanitizeFileName(ref.fileName)}`;

      await this.storage.uploadFile(
        TICKET_ATTACHMENT_BUCKET,
        storagePath,
        buffer,
        ref.mimeType,
      );

      await this.attachmentRepo.createAsAdmin(
        {
          ticketId: ticket.id,
          responseId: response?.id ?? null,
          orgId: ticket.orgId,
          storagePath,
          fileName: ref.fileName,
          mimeType: ref.mimeType,
          sizeBytes: buffer.byteLength,
          uploadedBy: null,
        },
        tx,
      );
    }

    return prepared.length;
  }
}
