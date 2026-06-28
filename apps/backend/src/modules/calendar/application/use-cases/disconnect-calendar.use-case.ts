import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_CONNECTION_REPOSITORY,
  ICalendarConnectionRepository,
} from "../../domain/calendar-connection.repository.interface";

/**
 * Desconecta o calendário externo da org (BL-1). Idempotente: sem conexão, nada
 * a fazer. Quando o provider real existir, também revogaria as credenciais via
 * {@link IExternalCalendarProvider}.
 */
@Injectable()
export class DisconnectCalendarUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTION_REPOSITORY)
    private readonly repo: ICalendarConnectionRepository,
  ) {}

  async execute(orgId: string): Promise<void> {
    await this.repo.deleteByOrg(orgId);
  }
}
