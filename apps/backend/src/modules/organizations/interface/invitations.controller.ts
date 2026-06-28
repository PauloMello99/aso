import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetInvitationByTokenUseCase } from "../application/use-cases/get-invitation-by-token.use-case";
import { AcceptInvitationUseCase } from "../application/use-cases/accept-invitation.use-case";
import { DeclineInvitationUseCase } from "../application/use-cases/decline-invitation.use-case";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";

@Controller("invitations")
export class InvitationsController {
  constructor(
    private readonly getByToken: GetInvitationByTokenUseCase,
    private readonly acceptInvitation: AcceptInvitationUseCase,
    private readonly declineInvitation: DeclineInvitationUseCase,
  ) {}

  /** Público — a tela de aceite consulta o convite pelo token (o segredo é o token). */
  @Get("lookup")
  lookup(@Query("token") token?: string) {
    if (!token) throw new BadRequestException("token is required");
    return this.getByToken.execute(token);
  }

  @Post("accept")
  @UseGuards(AuthGuard)
  accept(@CurrentUser() user: AuthUser, @Body() dto: AcceptInvitationDto) {
    return this.acceptInvitation.execute({ authUser: user, token: dto.token });
  }

  /** Recusa: remove o convite (permite reenviar o fluxo). Só o convidado. */
  @Post("decline")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async decline(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptInvitationDto,
  ) {
    await this.declineInvitation.execute({ authUser: user, token: dto.token });
  }
}
