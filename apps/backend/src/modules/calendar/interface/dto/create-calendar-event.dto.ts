import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateCalendarEventDto {
  @IsIn(["appointment", "unavailability"])
  type!: "appointment" | "unavailability";

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string | null;

  @IsUUID()
  @IsOptional()
  customerId?: string | null;

  @IsEmail()
  @IsOptional()
  @MaxLength(254)
  customerEmail?: string | null;

  @IsUUID()
  @IsOptional()
  assignedTo?: string | null;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsIn(["private", "shared"])
  @IsOptional()
  visibility?: "private" | "shared";
}
