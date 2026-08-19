import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { GetCustomerSelfRegistrationByTokenUseCase } from "../application/use-cases/get-customer-self-registration-by-token.use-case";
import { SubmitCustomerSelfRegistrationUseCase } from "../application/use-cases/submit-customer-self-registration.use-case";
import { GetCustomerUpdateInvitationByTokenUseCase } from "../application/use-cases/get-customer-update-invitation-by-token.use-case";
import { SubmitCustomerUpdateUseCase } from "../application/use-cases/submit-customer-update.use-case";
import { SubmitCustomerSelfRegistrationDto } from "./dto/submit-customer-self-registration.dto";
import { SubmitCustomerUpdateDto } from "./dto/submit-customer-update.dto";
import { extractRequestContext } from "../../anamnesis/interface/request-context";

@Controller("public")
export class PublicCustomerSelfServiceController {
  constructor(
    private readonly getRegistrationByToken: GetCustomerSelfRegistrationByTokenUseCase,
    private readonly submitRegistration: SubmitCustomerSelfRegistrationUseCase,
    private readonly getUpdateInvitationByToken: GetCustomerUpdateInvitationByTokenUseCase,
    private readonly submitUpdate: SubmitCustomerUpdateUseCase,
  ) {}

  @Get("customer-registrations/:token")
  async getRegistration(@Param("token") token: string) {
    return this.getRegistrationByToken.execute({ token });
  }

  @Post("customer-registrations/:token/submit")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async submitRegistrationForm(
    @Param("token") token: string,
    @Body() dto: SubmitCustomerSelfRegistrationDto,
    @Req() req: Request,
  ) {
    const { ip, userAgent } = extractRequestContext(req);
    return this.submitRegistration.execute({
      token,
      name: dto.name,
      birthDate: dto.birthDate,
      phone: dto.phone,
      gender: dto.gender,
      address: dto.address,
      number: dto.number,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      answers: dto.answers,
      signerFullName: dto.signerFullName,
      signerCpf: dto.signerCpf ?? null,
      signatureImageBase64: dto.signatureImageBase64,
      consentAccepted: dto.consentAccepted,
      consentVersion: dto.consentVersion,
      requestIp: ip,
      requestUserAgent: userAgent,
    });
  }

  @Get("customer-updates/:token")
  async getUpdateInvitation(@Param("token") token: string) {
    return this.getUpdateInvitationByToken.execute({ token });
  }

  @Post("customer-updates/:token/submit")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async submitUpdateForm(
    @Param("token") token: string,
    @Body() dto: SubmitCustomerUpdateDto,
  ) {
    return this.submitUpdate.execute({
      token,
      name: dto.name,
      email: dto.email,
      birthDate: dto.birthDate,
      phone: dto.phone,
      gender: dto.gender,
      address: dto.address,
      number: dto.number,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
    });
  }
}
