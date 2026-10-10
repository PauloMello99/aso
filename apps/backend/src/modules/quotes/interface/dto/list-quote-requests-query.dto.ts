import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

// Sem Min/Max de proposito: page/limit fora da faixa sao clampados no use-case.
export class ListQuoteRequestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
