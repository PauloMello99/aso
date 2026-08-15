import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { WebhookEventPayload } from "resend";
import type {
  IInboundEmailClient,
  InboundEmailAttachmentRef,
  InboundEmailBody,
  InboundEmailEvent,
  InboundWebhookHeaders,
} from "../domain/ports/inbound-email.port";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 15_000;

@Injectable()
export class ResendInboundEmailClient implements IInboundEmailClient {
  private readonly logger = new Logger(ResendInboundEmailClient.name);
  private readonly client: Resend;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("RESEND_API_KEY") ?? "";
    // O construtor do SDK lança se a key vier vazia e RESEND_API_KEY também
    // não estiver setada no processo. `webhooks.verify()` é puramente local
    // (HMAC via standardwebhooks) e não depende de key real; já
    // getReceivedEmail/listAttachments REALMENTE precisam de uma key válida
    // e falham com 401 da API se estiver ausente — comportamento correto,
    // não mascarado por este placeholder.
    this.client = new Resend(apiKey || "re_disabled_missing_RESEND_API_KEY");
    this.webhookSecret = config.get<string>("RESEND_WEBHOOK_SECRET") ?? "";
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: InboundWebhookHeaders,
  ): InboundEmailEvent {
    if (!this.webhookSecret) {
      // Diferente do Turnstile: aqui não existe "modo dev sem verificação".
      // Um webhook não verificado autoriza escrita (criação de resposta de
      // ticket), então SEMPRE lança — nenhum bypass em nenhum ambiente.
      throw new Error(
        "RESEND_WEBHOOK_SECRET ausente — não é possível verificar o webhook Resend",
      );
    }

    let payload: WebhookEventPayload;
    try {
      payload = this.client.webhooks.verify({
        payload: rawBody.toString("utf8"),
        headers: {
          id: headers.id,
          timestamp: headers.timestamp,
          signature: headers.signature,
        },
        webhookSecret: this.webhookSecret,
      });
    } catch (error) {
      throw new Error(
        `Assinatura de webhook Resend inválida: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!payload.type.startsWith("email.")) {
      return {
        type: payload.type,
        emailId: null,
        from: null,
        to: [],
        subject: null,
      };
    }

    // Todas as variantes "email.*" (incluindo "email.received") compartilham
    // email_id/from/to/subject em `data` — narrowing seguro sem checar cada
    // union member individualmente.
    const data = payload.data as unknown as {
      email_id: string;
      from: string;
      to: string[];
      subject: string;
    };

    return {
      type: payload.type,
      emailId: data.email_id,
      from: data.from,
      to: data.to,
      subject: data.subject,
    };
  }

  async getReceivedEmail(emailId: string): Promise<InboundEmailBody> {
    const { data, error } = await this.client.emails.receiving.get(emailId);

    if (error || !data) {
      throw new Error(
        `Falha ao buscar e-mail recebido ${emailId}: ${error?.message ?? "resposta vazia"}`,
      );
    }

    return {
      text: data.text,
      html: data.html,
      from: data.from,
      to: data.to,
      subject: data.subject,
    };
  }

  async listAttachments(
    emailId: string,
  ): Promise<InboundEmailAttachmentRef[]> {
    try {
      const { data, error } =
        await this.client.emails.receiving.attachments.list({ emailId });

      if (error || !data) {
        this.logger.warn(
          `Falha ao listar anexos do e-mail ${emailId}: ${error?.message ?? "resposta vazia"}`,
        );
        return [];
      }

      return data.data.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.filename ?? `anexo-${attachment.id}`,
        mimeType: attachment.content_type,
        sizeBytes: attachment.size,
        downloadUrl: attachment.download_url,
      }));
    } catch (error) {
      this.logger.warn(
        `Erro ao listar anexos do e-mail ${emailId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async downloadAttachment(ref: InboundEmailAttachmentRef): Promise<Buffer> {
    let res: Response;
    try {
      res = await fetch(ref.downloadUrl, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(
        `Falha ao baixar anexo "${ref.fileName}" (timeout ou erro de rede): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!res.ok) {
      throw new Error(
        `Falha ao baixar anexo "${ref.fileName}": HTTP ${res.status}`,
      );
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `Anexo "${ref.fileName}" excede o limite de ${MAX_ATTACHMENT_BYTES} bytes (content-length)`,
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `Anexo "${ref.fileName}" excede o limite de ${MAX_ATTACHMENT_BYTES} bytes`,
      );
    }

    return buffer;
  }
}
