import { Inject, Injectable } from "@nestjs/common";
import {
  DailyBalancePoint,
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveActor } from "./resolve-actor";

@Injectable()
export class GetBalanceHistoryUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    orgId: string,
    authId: string,
    from: Date,
    to: Date,
  ): Promise<DailyBalancePoint[]> {
    const { userId, isOwner } = await resolveActor(
      this.memberRepo,
      orgId,
      authId,
    );
    return this.transactionRepo.dailyBalanceHistory(
      orgId,
      from,
      to,
      isOwner ? undefined : userId,
    );
  }
}
