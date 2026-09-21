import type { RawBodyRequest } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { CampaignDeliveryWebhookController } from "./campaign-delivery-webhook.controller";
import { HandleCampaignBounceUseCase } from "../application/use-cases/handle-campaign-bounce.use-case";
import {
  CampaignDeliveryEvent,
  ICampaignDeliveryWebhookClient,
} from "../domain/campaign-delivery-webhook.port";

function buildFakeDeliveryClient(
  overrides: Partial<jest.Mocked<ICampaignDeliveryWebhookClient>> = {},
): jest.Mocked<ICampaignDeliveryWebhookClient> {
  return {
    verifyWebhook: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICampaignDeliveryWebhookClient>;
}

function buildFakeUseCase(
  overrides: Partial<jest.Mocked<HandleCampaignBounceUseCase>> = {},
): jest.Mocked<HandleCampaignBounceUseCase> {
  return {
    execute: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<HandleCampaignBounceUseCase>;
}

function buildRawBodyRequest(
  rawBody: Buffer | undefined,
): RawBodyRequest<Request> {
  return { rawBody } as unknown as RawBodyRequest<Request>;
}

function buildEvent(
  overrides: Partial<CampaignDeliveryEvent> = {},
): CampaignDeliveryEvent {
  return {
    type: "email.bounced",
    emailId: "email-1",
    tags: { campaign_send_id: "550e8400-e29b-41d4-a716-446655440000" },
    bounceType: "Permanent",
    bounceSubType: "General",
    bounceMessage: "The recipient's email address is invalid.",
    ...overrides,
  };
}

describe("CampaignDeliveryWebhookController", () => {
  const svixHeaders = {
    id: "msg_1",
    timestamp: "1700000000",
    signature: "v1,fake",
  };

  it("returns 401 (UnauthorizedException) when rawBody or svix headers are missing", async () => {
    const deliveryClient = buildFakeDeliveryClient();
    const useCase = buildFakeUseCase();
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    await expect(
      controller.handle(
        buildRawBodyRequest(undefined),
        svixHeaders.id,
        svixHeaders.timestamp,
        svixHeaders.signature,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(deliveryClient.verifyWebhook).not.toHaveBeenCalled();
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("returns 401 (UnauthorizedException) when the Svix signature is invalid, without calling the use-case", async () => {
    const deliveryClient = buildFakeDeliveryClient({
      verifyWebhook: jest.fn(() => {
        throw new Error("Assinatura de webhook de entrega Resend inválida");
      }),
    });
    const useCase = buildFakeUseCase();
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    await expect(
      controller.handle(
        buildRawBodyRequest(Buffer.from("{}")),
        svixHeaders.id,
        svixHeaders.timestamp,
        svixHeaders.signature,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("returns 200 {received:true, ignored:true} for event types other than email.bounced, without calling the use-case", async () => {
    const deliveryClient = buildFakeDeliveryClient({
      verifyWebhook: jest.fn().mockReturnValue(
        buildEvent({
          type: "email.delivered",
          bounceType: null,
          bounceSubType: null,
          bounceMessage: null,
        }),
      ),
    });
    const useCase = buildFakeUseCase();
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    const result = await controller.handle(
      buildRawBodyRequest(Buffer.from("{}")),
      svixHeaders.id,
      svixHeaders.timestamp,
      svixHeaders.signature,
    );

    expect(result).toEqual({ received: true, ignored: true });
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("calls the use-case and returns 200 {received:true, handled:true} for a valid email.bounced event", async () => {
    const event = buildEvent();
    const deliveryClient = buildFakeDeliveryClient({
      verifyWebhook: jest.fn().mockReturnValue(event),
    });
    const useCase = buildFakeUseCase({
      execute: jest.fn().mockResolvedValue({ handled: true }),
    });
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    const result = await controller.handle(
      buildRawBodyRequest(Buffer.from("{}")),
      svixHeaders.id,
      svixHeaders.timestamp,
      svixHeaders.signature,
    );

    expect(result).toEqual({ received: true, handled: true });
    expect(useCase.execute).toHaveBeenCalledWith(event);
  });

  it("returns 200 (NOT 5xx) when the use-case reports handled:false — deliberate inversion vs. the support inbound controller, which propagates real failures as 5xx", async () => {
    const deliveryClient = buildFakeDeliveryClient({
      verifyWebhook: jest.fn().mockReturnValue(buildEvent()),
    });
    const useCase = buildFakeUseCase({
      execute: jest
        .fn()
        .mockResolvedValue({ handled: false, reason: "no_tag" }),
    });
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    // `.resolves` (não `.rejects`) é o próprio teste da inversão: se o
    // controller lançasse aqui, o filtro global responderia 5xx e a Resend
    // reentregaria o mesmo evento indefinidamente.
    await expect(
      controller.handle(
        buildRawBodyRequest(Buffer.from("{}")),
        svixHeaders.id,
        svixHeaders.timestamp,
        svixHeaders.signature,
      ),
    ).resolves.toEqual({ received: true, handled: false });
    expect(useCase.execute).toHaveBeenCalledWith(buildEvent());
  });

  it("propagates (does not catch) a real exception thrown by the use-case, for the Resend retry to kick in", async () => {
    const deliveryClient = buildFakeDeliveryClient({
      verifyWebhook: jest.fn().mockReturnValue(buildEvent()),
    });
    const useCase = buildFakeUseCase({
      execute: jest.fn().mockRejectedValue(new Error("insert indisponível")),
    });
    const controller = new CampaignDeliveryWebhookController(
      deliveryClient,
      useCase,
    );

    await expect(
      controller.handle(
        buildRawBodyRequest(Buffer.from("{}")),
        svixHeaders.id,
        svixHeaders.timestamp,
        svixHeaders.signature,
      ),
    ).rejects.toThrow("insert indisponível");
  });
});
