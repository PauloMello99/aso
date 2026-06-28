import { Inject, Injectable } from "@nestjs/common";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
} from "../../domain/stock-verification.repository.interface";

@Injectable()
export class GetStockSettingsUseCase {
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly repo: IStockVerificationRepository,
  ) {}

  async execute(
    orgId: string,
  ): Promise<{ intervalDays: number | null; lastVerificationAt: Date | null }> {
    const [intervalDays, lastVerificationAt] = await Promise.all([
      this.repo.getInterval(orgId),
      this.repo.lastVerificationAt(orgId),
    ]);
    return { intervalDays, lastVerificationAt };
  }
}
