import { IsNotEmpty, IsOptional, IsString } from "class-validator";

// requiresAgeVerification não entra aqui de propósito: tipos de serviço são criáveis
// inline por qualquer membro (POST types sem OrgOwnerGuard), mas a flag de verificação
// de idade é uma regra de negócio sensível — só o owner pode habilitá-la, via
// PATCH types/:typeId (OrgOwnerGuard). Ver UpdateServiceTypeDto.
export class CreateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;
}
