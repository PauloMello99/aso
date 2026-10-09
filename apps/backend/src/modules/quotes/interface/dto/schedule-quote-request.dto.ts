import { IsInt, IsISO8601, Max, Min } from "class-validator";
import {
  QUOTE_SCHEDULE_MAX_DURATION_MINUTES,
  QUOTE_SCHEDULE_MIN_DURATION_MINUTES,
} from "../../domain/quote-schedule";

export class ScheduleQuoteRequestDto {
  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsInt()
  @Min(QUOTE_SCHEDULE_MIN_DURATION_MINUTES)
  @Max(QUOTE_SCHEDULE_MAX_DURATION_MINUTES)
  durationMinutes!: number;
}
