import { IsUUID } from "class-validator";

export class LinkTicketOrganizationDto {
  @IsUUID()
  orgId!: string;
}
