import { IsEmail, IsUUID } from "class-validator";

export class SendCustomerSelfRegistrationInviteDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  serviceTypeId!: string;
}
