import { IsIn, IsOptional } from "class-validator";
import { CAMPAIGN_TRIGGERS } from "../../domain/campaign-trigger";

export class UnsubscribeFromCampaignsDto {
  @IsOptional()
  @IsIn(CAMPAIGN_TRIGGERS)
  trigger?: (typeof CAMPAIGN_TRIGGERS)[number];
}
