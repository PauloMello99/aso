import { createHmac } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { ResendCampaignDeliveryWebhookClient } from "./resend-campaign-delivery-webhook.client";

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

describe("ResendCampaignDeliveryWebhookClient", () => {
  describe("verifyWebhook", () => {
    it("retorna o evento de bounce parseado quando a assinatura é válida", () => {
      const client = new ResendCampaignDeliveryWebhookClient(
        buildConfig({ RESEND_DELIVERY_WEBHOOK_SECRET: TEST_SECRET }),
      );
      const id = "msg_123";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: "email.bounced",
        created_at: new Date().toISOString(),
        data: {
          email_id: "email_abc",
          created_at: new Date().toISOString(),
          from: "campanhas@example.com",
          to: ["cliente@example.com"],
          subject: "Assunto",
          tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
          bounce: {
            type: "Permanent",
            subType: "General",
            message: "The recipient's email address is invalid.",
          },
        },
      });
      const signature = signPayload(TEST_SECRET, id, timestamp, payload);

      const event = client.verifyWebhook(Buffer.from(payload), {
        id,
        timestamp,
        signature,
      });

      expect(event).toEqual({
        type: "email.bounced",
        emailId: "email_abc",
        tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
        bounceType: "Permanent",
        bounceSubType: "General",
        bounceMessage: "The recipient's email address is invalid.",
      });
    });

    it("retorna tags vazio e campos de bounce nulos para evento email.* que não é bounce", () => {
      const client = new ResendCampaignDeliveryWebhookClient(
        buildConfig({ RESEND_DELIVERY_WEBHOOK_SECRET: TEST_SECRET }),
      );
      const id = "msg_124";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: "email.delivered",
        created_at: new Date().toISOString(),
        data: {
          email_id: "email_def",
          created_at: new Date().toISOString(),
          from: "campanhas@example.com",
          to: ["cliente@example.com"],
          subject: "Assunto",
        },
      });
      const signature = signPayload(TEST_SECRET, id, timestamp, payload);

      const event = client.verifyWebhook(Buffer.from(payload), {
        id,
        timestamp,
        signature,
      });

      expect(event).toEqual({
        type: "email.delivered",
        emailId: "email_def",
        tags: {},
        bounceType: null,
        bounceSubType: null,
        bounceMessage: null,
      });
    });

    it("sempre lança quando RESEND_DELIVERY_WEBHOOK_SECRET está ausente (sem bypass em nenhum ambiente)", () => {
      const client = new ResendCampaignDeliveryWebhookClient(
        buildConfig({
          RESEND_DELIVERY_WEBHOOK_SECRET: undefined,
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

    it("lança quando a assinatura foi adulterada", () => {
      const client = new ResendCampaignDeliveryWebhookClient(
        buildConfig({ RESEND_DELIVERY_WEBHOOK_SECRET: TEST_SECRET }),
      );
      const id = "msg_125";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({
        type: "email.bounced",
        created_at: new Date().toISOString(),
        data: {
          email_id: "email_ghi",
          created_at: new Date().toISOString(),
          from: "campanhas@example.com",
          to: ["cliente@example.com"],
          subject: "Assunto",
          tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
          bounce: { type: "Permanent", subType: "General", message: "x" },
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
  });
});
