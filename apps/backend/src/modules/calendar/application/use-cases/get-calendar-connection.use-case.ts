import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CALENDAR_CONNECTION_REPOSITORY,
  CalendarConnectionData,
  ICalendarConnectionRepository,
} from "../../domain/calendar-connection.repository.interface";

export interface CalendarConnectionResult {
  enabled: boolean;
  connection: CalendarConnectionData | null;
}

@Injectable()
export class GetCalendarConnectionUseCase {
  constructor(
    @Inject(CALENDAR_CONNECTION_REPOSITORY)
    private readonly repo: ICalendarConnectionRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(orgId: string): Promise<CalendarConnectionResult> {
    const enabled =
      this.config.get<string>("EXTERNAL_CALENDARS_ENABLED") === "true";
    const connection = await this.repo.findByOrg(orgId);
    return { enabled, connection };
  }
}
