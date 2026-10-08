import { IsIn } from "class-validator";

export class RespondAppointmentConfirmationDto {
  @IsIn(["confirmed", "canceled_by_customer"])
  response!: "confirmed" | "canceled_by_customer";
}
