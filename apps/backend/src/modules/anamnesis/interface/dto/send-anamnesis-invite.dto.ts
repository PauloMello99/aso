import { IsUUID } from "class-validator";

export class SendAnamnesisInviteDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  serviceTypeId!: string;
}
