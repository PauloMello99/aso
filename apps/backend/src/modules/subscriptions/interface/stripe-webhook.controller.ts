import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { HandleStripeWebhookUseCase } from "../application/use-cases/handle-stripe-webhook.use-case";

@Controller("webhooks/stripe")
@SkipThrottle()
export class StripeWebhookController {
  constructor(private readonly handleWebhook: HandleStripeWebhookUseCase) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    await this.handleWebhook.execute(req.rawBody ?? Buffer.from(""), signature);
    return { received: true };
  }
}
