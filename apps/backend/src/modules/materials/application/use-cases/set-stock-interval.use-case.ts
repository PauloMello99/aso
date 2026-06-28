import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { OrgForbiddenException } from "../../../organizations/domain/exceptions/org-forbidden.exception";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
} from "../../domain/stock-verification.repository.interface";

@Injectable()
export class SetStockIntervalUseCase {
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly repo: IStockVerificationRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(
    orgId: string,
    authId: string,
    days: number | null,
  ): Promise<{ intervalDays: number | null }> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();
    const value = days && days > 0 ? days : null;
    await this.repo.setInterval(orgId, value);
    return { intervalDays: value };
  }
}
