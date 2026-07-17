import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { GetAnamnesisResponseByTokenUseCase } from "../application/use-cases/get-anamnesis-response-by-token.use-case";
import { SubmitAnamnesisResponseUseCase } from "../application/use-cases/submit-anamnesis-response.use-case";
import { SubmitAnamnesisResponseDto } from "./dto/submit-anamnesis-response.dto";
import { extractRequestContext } from "./request-context";

/**
 * Sem login — o próprio token do link é o segredo (igual `InvitationsController#lookup`).
 * O GET nunca expõe nome/slug da org nem ids internos: só perguntas, primeiro
 * nome do cliente, status computado e expiração.
 */
@Controller("public/anamnesis-responses")
export class PublicAnamnesisController {
  constructor(
    private readonly getByToken: GetAnamnesisResponseByTokenUseCase,
    private readonly submitResponse: SubmitAnamnesisResponseUseCase,
  ) {}

  @Get(":token")
  async get(@Param("token") token: string) {
    return this.getByToken.execute(token);
  }

  // Throttle mais restrito que o default global (120/min): payload maior e
  // mais sensível (dado de saúde) que um lookup.
  @Post(":token/submit")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async submit(
    @Param("token") token: string,
    @Body() dto: SubmitAnamnesisResponseDto,
    @Req() req: Request,
  ) {
    const { ip, userAgent } = extractRequestContext(req);
    await this.submitResponse.execute({
      token,
      answers: dto.answers,
      signerFullName: dto.signerFullName,
      signerCpf: dto.signerCpf ?? null,
      signatureImageBase64: dto.signatureImageBase64,
      requestIp: ip,
      requestUserAgent: userAgent,
    });
  }
}
