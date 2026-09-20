import { Inject, Injectable } from "@nestjs/common";
import {
  buildPaginated,
  Paginated,
  resolvePageRequest,
} from "../../../../common/pagination/pagination";
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
import { TransactionView } from "./list-transactions.use-case";

const PAGINATION_BOUNDS = { defaultLimit: 50, maxLimit: 200 };

export interface ListTransactionsPageInput {
  orgId: string;
  authId: string;
  filter?: ListTransactionsFilter;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListTransactionsPageUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
  ) {}

  async execute(
    input: ListTransactionsPageInput,
  ): Promise<Paginated<TransactionView>> {
    const { userId, isOwner } = await resolveActor(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const filter: ListTransactionsFilter = { ...input.filter };
    if (!isOwner) filter.createdBy = userId;

    const { page, limit, offset } = resolvePageRequest(
      { page: input.page, limit: input.limit },
      PAGINATION_BOUNDS,
    );

    const { rows, total } = await this.transactionRepo.findPageByOrg(
      input.orgId,
      filter,
      { limit, offset },
    );

    const ids = rows.map((r) => r.id);

    const [reversedIds, serviceIdsByTransactionId] = await Promise.all([
      this.transactionRepo.findReversedIdsIn(input.orgId, ids),
      this.serviceRepo.findServiceIdsByTransactionIds(input.orgId, ids),
    ]);

    const views: TransactionView[] = rows.map((entity) => ({
      entity,
      reversed: reversedIds.has(entity.id),
      serviceId: serviceIdsByTransactionId.get(entity.id) ?? null,
    }));

    return buildPaginated(views, total, page, limit);
  }
}
