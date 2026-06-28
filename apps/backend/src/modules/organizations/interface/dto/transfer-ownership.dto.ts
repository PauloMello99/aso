import { IsUUID } from "class-validator";

export class TransferOwnershipDto {
  /** Membro (memberId) que se tornará o novo proprietário da organização. */
  @IsUUID()
  memberId!: string;
}
