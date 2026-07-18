import { Inject, Injectable } from "@nestjs/common";
import {
  CALENDAR_CONNECTION_REPOSITORY,
  ICalendarConnectionRepository,
} from "../../domain/calendar-connection.repository.interface";

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
