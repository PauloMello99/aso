import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;
}
