import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  ListTransactionsFilter,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import { resolveActor } from "./resolve-actor";

export interface TransactionView {
  entity: TransactionEntity;
  reversed: boolean;
  serviceId: string | null;
}

export interface ListTransactionsInput {
  orgId: string;
  authId: string;
  filter?: ListTransactionsFilter;
}

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
  ) {}

  async execute(input: ListTransactionsInput): Promise<TransactionView[]> {
    const { userId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const filter: ListTransactionsFilter = { ...input.filter };
    if (!isOwner) filter.createdBy = userId;

    const [transactions, reversedIds] = await Promise.all([
      this.transactionRepo.findAllByOrg(input.orgId, filter),
      this.transactionRepo.findReversedIds(input.orgId),
    ]);

    const serviceIdsByTransactionId =
      await this.serviceRepo.findServiceIdsByTransactionIds(
        input.orgId,
        transactions.map((t) => t.id),
      );

    return transactions.map((entity) => ({
      entity,
      reversed: reversedIds.has(entity.id),
      serviceId: serviceIdsByTransactionId.get(entity.id) ?? null,
    }));
  }
}
