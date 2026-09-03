import { IsIn, IsOptional } from "class-validator";

export class UpdateMemberClassificationDto {
  @IsOptional()
  @IsIn(["resident", "guest"], {
    message: "classification must be resident or guest",
  })
  classification?: "resident" | "guest" | null;
}
