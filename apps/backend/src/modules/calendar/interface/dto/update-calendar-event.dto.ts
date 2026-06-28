import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateCalendarEventDto {
  @IsIn(["appointment", "unavailability"])
  @IsOptional()
  type?: "appointment" | "unavailability";

  @IsIn(["scheduled", "canceled"])
  @IsOptional()
  status?: "scheduled" | "canceled";

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string | null;

  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsISO8601()
  @IsOptional()
  startsAt?: string;

  @IsISO8601()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;
}
