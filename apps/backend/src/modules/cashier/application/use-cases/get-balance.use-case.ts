import { Inject, Injectable } from "@nestjs/common";
import {
  BalanceSnapshot,
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveActor } from "./resolve-actor";

@Injectable()
export class GetBalanceUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(orgId: string, authId: string): Promise<BalanceSnapshot> {
    const { userId, isOwner } = await resolveActor(
      this.memberRepo,
      orgId,
      authId,
    );
    // Funcionário vê o saldo dos próprios lançamentos; owner vê o total da org.
    return this.transactionRepo.balance(orgId, isOwner ? undefined : userId);
  }
}
