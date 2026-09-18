import { Inject, Injectable } from "@nestjs/common";
import { TransactionEntity, PaymentMethod, TransactionType } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import {
  IServiceRepository,
  SERVICE_REPOSITORY,
} from "../../../services/domain/service.repository.interface";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

export interface CorrectTransactionInput {
  orgId: string;
  transactionId: string;
  correctedBy?: string | null;
  description: string;
  type: TransactionType;
  grossCents: number;
  paymentMethod: PaymentMethod;
  /** Faixa CORRIGIDA (pode diferir da faixa do lançamento original — é isso
   * que permite corrigir, por exemplo, de 6x para 1x). */
  installments?: number | null;
  transactedAt?: Date;
}

export interface CorrectTransactionResult {
  reversal: TransactionEntity;
  replacement: TransactionEntity;
}

@Injectable()
export class CorrectTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepo: IServiceRepository,
    private readonly reverseTransaction: ReverseTransactionUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    input: CorrectTransactionInput,
  ): Promise<CorrectTransactionResult> {
    const original = await this.transactionRepo.findById(
      input.transactionId,
      input.orgId,
    );
    if (!original) throw new TransactionNotFoundException(input.transactionId);

    if (
      await this.serviceRepo.existsByPaymentTransactionId(input.transactionId)
    ) {
      throw new TransactionIsServicePaymentException(input.transactionId);
    }

    const reversal = await this.reverseTransaction.execute({
      orgId: input.orgId,
      transactionId: input.transactionId,
      authId: input.correctedBy ?? "",
    });

    const replacement = await this.createTransaction.execute({
      orgId: input.orgId,
      authId: input.correctedBy ?? "",
      trustedCreatedBy: original.createdBy,
      // Passa o snapshot de taxa do lançamento original para que a perna de
      // reposição reuse a mesma taxa quando método E faixa de parcelas não
      // mudaram (evita reprecificar e gerar diferença de dinheiro no livro
      // append-only). Se método OU faixa mudaram, CreateTransactionUseCase
      // ignora este snapshot e reprecifica via resolveFee, priorizando a taxa
      // do membro (createdBy) antes de cair na taxa da ORG.
      originalFee: {
        paymentMethod: original.paymentMethod,
        feePercent: original.feePercent,
        feeFixedCents: original.feeFixedCents,
        feeSource: original.feeSource,
        feeConfigId: original.feeConfigId,
        installments: original.installments,
      },
      description: input.description,
      type: input.type,
      grossCents: input.grossCents,
      paymentMethod: input.paymentMethod,
      installments: input.installments,
      transactedAt: input.transactedAt,
    });

    return { reversal, replacement };
  }
}
