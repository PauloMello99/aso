import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionAlreadyReversedException } from "../../domain/exceptions/transaction-already-reversed.exception";
import { TransactionNotReversibleException } from "../../domain/exceptions/transaction-not-reversible.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";

export interface ReverseTransactionInput {
  orgId: string;
  transactionId: string;
  reversedBy?: string | null;
}

@Injectable()
export class ReverseTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
  ) {}

  async execute(input: ReverseTransactionInput): Promise<TransactionEntity> {
    const original = await this.transactionRepo.findById(
      input.transactionId,
      input.orgId,
    );
    if (!original) throw new TransactionNotFoundException(input.transactionId);

    // Lançamento vinculado a um serviço só pode ser estornado pelo fluxo
    // dedicado (PATCH /services/:id/payment), que mantém amount_cents e
    // payment_transaction_id do serviço em sincronia com o caixa.
    if (
      await this.serviceRepo.existsByPaymentTransactionId(input.transactionId)
    ) {
      throw new TransactionIsServicePaymentException(input.transactionId);
    }

    // Não se estorna um estorno.
    if (original.isReversal) {
      throw new TransactionNotReversibleException(input.transactionId);
    }

    const existingReversal = await this.transactionRepo.findReversalOf(
      original.id,
    );
    if (existingReversal) {
      throw new TransactionAlreadyReversedException(input.transactionId);
    }

    // Linha de estorno: tipo oposto, mesmos valores, vínculo com a original.
    return this.transactionRepo.create({
      orgId: original.orgId,
      createdBy: input.reversedBy ?? null,
      description: `Estorno: ${original.description}`,
      type: original.type === "income" ? "outcome" : "income",
      grossCents: original.grossCents,
      feeCents: original.feeCents,
      netCents: original.netCents,
      paymentMethod: original.paymentMethod,
      reversesTransactionId: original.id,
      transactedAt: new Date(),
    });
  }
}
