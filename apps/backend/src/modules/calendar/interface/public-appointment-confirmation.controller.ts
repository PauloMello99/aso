import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { GetAppointmentConfirmationByTokenUseCase } from "../application/use-cases/get-appointment-confirmation-by-token.use-case";
import { RespondAppointmentConfirmationUseCase } from "../application/use-cases/respond-appointment-confirmation.use-case";
import { AppointmentConfirmationFeatureFlagGuard } from "./appointment-confirmation-feature-flag.guard";
import { RespondAppointmentConfirmationDto } from "./dto/respond-appointment-confirmation.dto";

// Rota pública (sem AuthGuard): o token opaco é a única credencial. Não usa
// ParseUUIDPipe — o token é base64url de 43 caracteres, validado no use-case.
@Controller("public/appointment-confirmations")
@UseGuards(AppointmentConfirmationFeatureFlagGuard)
export class PublicAppointmentConfirmationController {
  constructor(
    private readonly getByToken: GetAppointmentConfirmationByTokenUseCase,
    private readonly respond: RespondAppointmentConfirmationUseCase,
  ) {}

  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async get(@Param("token") token: string) {
    return this.getByToken.execute(token);
  }

  @Post(":token/respond")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  async respondTo(
    @Param("token") token: string,
    @Body() dto: RespondAppointmentConfirmationDto,
  ) {
    return this.respond.execute({ token, response: dto.response });
  }
}
