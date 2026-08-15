import { createHmac } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { ResendInboundEmailClient } from "./resend-inbound-email.client";
import type { InboundEmailAttachmentRef } from "../domain/ports/inbound-email.port";

function buildConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

/** Secret base64 válido (32 bytes), mesmo formato aceito pelo standardwebhooks. */
const TEST_SECRET = Buffer.from("a".repeat(32)).toString("base64");

function signPayload(
  secretBase64: string,
  id: string,
  timestamp: string,
  payload: string,
): string {
  const key = Buffer.from(secretBase64, "base64");
  const toSign = `${id}.${timestamp}.${payload}`;
  const signature = createHmac("sha256", key).update(toSign).digest("base64");
  return `v1,${signature}`;
}

describe("ResendInboundEmailClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("verifyWebhook", () => {
    it("retorna o evento tipado quando a assinatura é válida", () => {
      const client = new ResendInboundEmailClient(
        buildConfig({
          RESEND_WEBHOOK_SECRET: TEST_SECRET,
        }),
      );
      const id = "msg_123";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: "email.received",
        created_at: new Date().toISOString(),
        data: {
          email_id: "email_abc",
          created_at: new Date().toISOString(),
          from: "cliente@example.com",
          to: ["suporte+ticket-1@assessorink-so.com"],
          bcc: [],
          cc: [],
          message_id: "msg_abc",
          subject: "Re: Ticket #1",
          attachments: [],
        },
      });
      const signature = signPayload(TEST_SECRET, id, timestamp, payload);

      const event = client.verifyWebhook(Buffer.from(payload), {
        id,
        timestamp,
        signature,
      });

      expect(event).toEqual({
        type: "email.received",
        emailId: "email_abc",
        from: "cliente@example.com",
        to: ["suporte+ticket-1@assessorink-so.com"],
        subject: "Re: Ticket #1",
      });
    });

    it("lança quando a assinatura foi adulterada", () => {
      const client = new ResendInboundEmailClient(
        buildConfig({
          RESEND_WEBHOOK_SECRET: TEST_SECRET,
        }),
      );
      const id = "msg_123";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: "email.received",
        created_at: new Date().toISOString(),
        data: {
          email_id: "email_abc",
          created_at: new Date().toISOString(),
          from: "cliente@example.com",
          to: ["suporte@assessorink-so.com"],
          bcc: [],
          cc: [],
          message_id: "msg_abc",
          subject: "Assunto",
          attachments: [],
        },
      });
      const validSignature = signPayload(TEST_SECRET, id, timestamp, payload);
      const tamperedPayload = payload.replace("cliente", "atacante");

      expect(() =>
        client.verifyWebhook(Buffer.from(tamperedPayload), {
          id,
          timestamp,
          signature: validSignature,
        }),
      ).toThrow();
    });

    it("sempre lança quando RESEND_WEBHOOK_SECRET está ausente (sem bypass em nenhum ambiente)", () => {
      const client = new ResendInboundEmailClient(
        buildConfig({
          RESEND_WEBHOOK_SECRET: undefined,
          NODE_ENV: "development",
        }),
      );

      expect(() =>
        client.verifyWebhook(Buffer.from("{}"), {
          id: "msg_1",
          timestamp: "1700000000",
          signature: "v1,invalid",
        }),
      ).toThrow();
    });
  });

  describe("listAttachments", () => {
    it("retorna array vazio, sem lançar, quando a API da Resend falha", async () => {
      const client = new ResendInboundEmailClient(
        buildConfig({
          RESEND_API_KEY: "re_test",
          RESEND_WEBHOOK_SECRET: TEST_SECRET,
        }),
      );
      // Sem hook de injeção para o SDK da Resend — sobrescreve o client
      // interno (mesmo padrão de mock usado para SDKs de terceiros sem DI).
      (
        client as unknown as {
          client: {
            emails: {
              receiving: {
                attachments: { list: jest.Mock };
              };
            };
          };
        }
      ).client.emails.receiving.attachments.list = jest
        .fn()
        .mockRejectedValue(new Error("network error"));

      await expect(client.listAttachments("email_abc")).resolves.toEqual([]);
    });
  });

  describe("downloadAttachment", () => {
    const ref: InboundEmailAttachmentRef = {
      id: "att_1",
      fileName: "arquivo.pdf",
      mimeType: "application/pdf",
      sizeBytes: 11 * 1024 * 1024,
      downloadUrl: "https://resend.com/signed/att_1",
    };

    it("lança quando o anexo excede 10 MiB (content-length)", async () => {
      const client = new ResendInboundEmailClient(
        buildConfig({
          RESEND_WEBHOOK_SECRET: TEST_SECRET,
        }),
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === "content-length" ? String(11 * 1024 * 1024) : null,
        },
        arrayBuffer: async () => new ArrayBuffer(0),
      }) as unknown as typeof fetch;

      await expect(client.downloadAttachment(ref)).rejects.toThrow();
    });
  });
});
