import type { RawBodyRequest } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SupportInboundWebhookController } from "./support-inbound-webhook.controller";
import { HandleInboundEmailUseCase } from "../application/use-cases/handle-inbound-email.use-case";
import {
  IInboundEmailClient,
  InboundEmailEvent,
} from "../domain/ports/inbound-email.port";

function buildFakeEmailClient(
  overrides: Partial<jest.Mocked<IInboundEmailClient>> = {},
): jest.Mocked<IInboundEmailClient> {
  return {
    verifyWebhook: jest.fn(),
    getReceivedEmail: jest.fn(),
    listAttachments: jest.fn(),
    downloadAttachment: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IInboundEmailClient>;
}

function buildFakeUseCase(
  overrides: Partial<jest.Mocked<HandleInboundEmailUseCase>> = {},
): jest.Mocked<HandleInboundEmailUseCase> {
  return {
    execute: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<HandleInboundEmailUseCase>;
}

function buildRawBodyRequest(
  rawBody: Buffer | undefined,
): RawBodyRequest<Request> {
  return { rawBody } as unknown as RawBodyRequest<Request>;
}

function buildEvent(overrides: Partial<InboundEmailEvent> = {}): InboundEmailEvent {
  return {
    type: "email.received",
    emailId: "email-1",
    from: "cliente@example.com",
    to: ["suporte@assessorink-so.com"],
    subject: "Dúvida",
    ...overrides,
  };
}

describe("SupportInboundWebhookController", () => {
  const svixHeaders = {
    id: "msg_1",
    timestamp: "1700000000",
    signature: "v1,fake",
  };

  it("returns 401 (UnauthorizedException) when rawBody or svix headers are missing", async () => {
    const emailClient = buildFakeEmailClient();
    const useCase = buildFakeUseCase();
    const controller = new SupportInboundWebhookController(
      emailClient,
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
    expect(emailClient.verifyWebhook).not.toHaveBeenCalled();
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it("returns 401 (UnauthorizedException) when the Svix signature is invalid", async () => {
    const emailClient = buildFakeEmailClient({
      verifyWebhook: jest.fn(() => {
        throw new Error("Assinatura de webhook Resend inválida");
      }),
    });
    const useCase = buildFakeUseCase();
    const controller = new SupportInboundWebhookController(
      emailClient,
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

  it("returns 200 {received:true, ignored:true} for event types other than email.received, without calling the use-case", async () => {
    const emailClient = buildFakeEmailClient({
      verifyWebhook: jest
        .fn()
        .mockReturnValue(buildEvent({ type: "email.bounced" })),
    });
    const useCase = buildFakeUseCase();
    const controller = new SupportInboundWebhookController(
      emailClient,
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

  it("returns 200 {received:true, claimed} on success, calling the use-case with emailId and svix-id", async () => {
    const emailClient = buildFakeEmailClient({
      verifyWebhook: jest.fn().mockReturnValue(buildEvent()),
    });
    const useCase = buildFakeUseCase({
      execute: jest.fn().mockResolvedValue({
        claimed: true,
        ticketId: "ticket-1",
        responseId: null,
        outcome: "ticket_created;att=0/0",
      }),
    });
    const controller = new SupportInboundWebhookController(
      emailClient,
      useCase,
    );

    const result = await controller.handle(
      buildRawBodyRequest(Buffer.from("{}")),
      svixHeaders.id,
      svixHeaders.timestamp,
      svixHeaders.signature,
    );

    expect(result).toEqual({ received: true, claimed: true });
    expect(useCase.execute).toHaveBeenCalledWith("email-1", null);
  });

  it("returns 200 {received:true, ignored:true} when a verified email.received event has no emailId", async () => {
    const emailClient = buildFakeEmailClient({
      verifyWebhook: jest
        .fn()
        .mockReturnValue(buildEvent({ emailId: null })),
    });
    const useCase = buildFakeUseCase();
    const controller = new SupportInboundWebhookController(
      emailClient,
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

  it("propagates (does not catch) an exception thrown by the use-case — no try/catch swallowing infra failures into a 200", async () => {
    const emailClient = buildFakeEmailClient({
      verifyWebhook: jest.fn().mockReturnValue(buildEvent()),
    });
    const useCase = buildFakeUseCase({
      execute: jest.fn().mockRejectedValue(new Error("storage indisponível")),
    });
    const controller = new SupportInboundWebhookController(
      emailClient,
      useCase,
    );

    await expect(
      controller.handle(
        buildRawBodyRequest(Buffer.from("{}")),
        svixHeaders.id,
        svixHeaders.timestamp,
        svixHeaders.signature,
      ),
    ).rejects.toThrow("storage indisponível");
  });
});
