import { IsInt, Min } from "class-validator";

export class MarkChangelogSeenDto {
  @IsInt()
  @Min(1)
  version!: number;
}
