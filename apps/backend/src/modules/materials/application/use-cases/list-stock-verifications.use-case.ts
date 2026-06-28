import { Inject, Injectable } from "@nestjs/common";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
  VerificationSummary,
} from "../../domain/stock-verification.repository.interface";

@Injectable()
export class ListStockVerificationsUseCase {
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly repo: IStockVerificationRepository,
  ) {}

  execute(orgId: string): Promise<VerificationSummary[]> {
    return this.repo.listByOrg(orgId);
  }
}
