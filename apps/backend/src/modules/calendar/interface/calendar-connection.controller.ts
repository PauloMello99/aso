import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { GetCalendarConnectionUseCase } from "../application/use-cases/get-calendar-connection.use-case";
import { DisconnectCalendarUseCase } from "../application/use-cases/disconnect-calendar.use-case";

/**
 * Conexão de calendário externo da org (BL-1, por organização). Leitura por
 * membro; gestão (desconectar) owner-only. A conexão viva (OAuth/sync) é futura
 * e fica atrás da flag EXTERNAL_CALENDARS_ENABLED.
 */
@Controller("orgs/:orgId/calendar-connection")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class CalendarConnectionController {
  constructor(
    private readonly getConnection: GetCalendarConnectionUseCase,
    private readonly disconnect: DisconnectCalendarUseCase,
  ) {}

  @Get()
  get(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.getConnection.execute(orgId);
  }

  @Delete()
  @UseGuards(OrgOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("orgId", ParseUUIDPipe) orgId: string) {
    await this.disconnect.execute(orgId);
  }
}
