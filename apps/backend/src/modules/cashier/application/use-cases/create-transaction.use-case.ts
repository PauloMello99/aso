import { Inject, Injectable } from "@nestjs/common";
import {
  computeNet,
  resolveFee,
  FeeConfig,
  FeeSource,
} from "../../domain/fee-calculator";
import {
  PaymentMethod,
  TransactionEntity,
  TransactionType,
} from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import {
  IPaymentFeeRepository,
  PAYMENT_FEE_REPOSITORY,
} from "../../domain/payment-fee.repository.interface";
import {
  IMemberPaymentFeeRepository,
  MEMBER_PAYMENT_FEE_REPOSITORY,
} from "../../domain/member-payment-fee.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { resolveActor, resolveCreatedBy } from "./resolve-actor";

export interface CreateTransactionInput {
  orgId: string;
  authId: string;
  createdBy?: string | null;
  trustedCreatedBy?: string | null;
  /**
   * Snapshot de taxa do lançamento ORIGINAL, passado apenas por
   * CorrectTransactionUseCase no ramo de correção. Quando o método de pagamento
   * da correção é o MESMO do original, este snapshot é reusado tal e qual (só
   * `feeCents`/`netCents` são recomputados sobre o novo gross); quando o método
   * muda, é ignorado e a taxa é reprecificada pela ORG.
   */
  originalFee?: {
    paymentMethod: PaymentMethod;
    feePercent: string | null;
    feeFixedCents: number | null;
    feeSource: FeeSource | null;
    feeConfigId: string | null;
  };
  description: string;
  type: TransactionType;
  grossCents: number;
  paymentMethod: PaymentMethod;
  categoryId?: string | null;
  transactedAt?: Date;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(PAYMENT_FEE_REPOSITORY)
    private readonly feeRepo: IPaymentFeeRepository,
    @Inject(MEMBER_PAYMENT_FEE_REPOSITORY)
    private readonly memberFeeRepo: IMemberPaymentFeeRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: CreateTransactionInput): Promise<TransactionEntity> {
    let createdBy: string | null;
    if (input.trustedCreatedBy !== undefined) {
      createdBy = input.trustedCreatedBy;
    } else {
      const { userId, isOwner } = await resolveActor(
        this.memberRepo,
        input.orgId,
        input.authId,
      );
      createdBy = await resolveCreatedBy(
        this.memberRepo,
        input.orgId,
        userId,
        isOwner,
        input.createdBy,
      );
    }

    const isCorrection = input.trustedCreatedBy !== undefined;

    // Regra de taxa neste use-case:
    // - Caminho manual (`trustedCreatedBy` indefinido — INALTERADO): resolve via
    //   `resolveFee(method, taxa própria de `createdBy`, taxa da ORG)`.
    // - Ramo de CORREÇÃO (via CorrectTransactionUseCase, único que define
    //   `trustedCreatedBy`) de um `income` com o MESMO método de pagamento do
    //   lançamento original: REUSA o snapshot de taxa que o original congelou
    //   (`feePercent`/`feeFixedCents`/`feeSource`/`feeConfigId`) e recomputa só
    //   `feeCents`/`netCents` sobre o novo gross. Reprecificar pela ORG aqui
    //   trocaria a taxa aplicada e criaria diferença real de dinheiro num livro
    //   append-only.
    // - Ramo de correção com método de pagamento DIFERENTE (ou não-`income`): o
    //   snapshot antigo é inaplicável, então cai na taxa da ORG. `memberFee`
    //   segue `null` porque nesse ramo `createdBy` vem de
    //   `transactions.created_by` da transação original — coluna hoje heterogênea
    //   entre auth id e users.id (ver comentário do audit abaixo); um lookup por
    //   users.id sairia vazio em silêncio e mascararia esse bug.
    const original = isCorrection ? input.originalFee : undefined;

    let feeConfig: FeeConfig | null;
    let feeConfigId: string | null;
    let feePercent: string | null;
    let feeFixedCents: number | null;
    let feeSource: FeeSource;

    if (
      input.type === "income" &&
      original != null &&
      input.paymentMethod === original.paymentMethod
    ) {
      feeConfig =
        original.feeSource === "none" ||
        original.feePercent === null ||
        original.feeFixedCents === null
          ? null
          : {
              percent: original.feePercent,
              fixedCents: original.feeFixedCents,
            };
      feeConfigId = original.feeConfigId;
      feePercent = original.feePercent;
      feeFixedCents = original.feeFixedCents;
      feeSource = original.feeSource ?? "none";
    } else {
      const feeUserId = isCorrection ? null : createdBy;

      const memberFee =
        input.type === "income" && feeUserId
          ? await this.memberFeeRepo.findActiveByOrgUserAndMethod(
              input.orgId,
              feeUserId,
              input.paymentMethod,
            )
          : null;

      const orgFee =
        input.type === "income"
          ? await this.feeRepo.findByOrgAndMethod(
              input.orgId,
              input.paymentMethod,
            )
          : null;

      const resolved = resolveFee(input.paymentMethod, memberFee, orgFee);
      feeConfig = resolved.config;
      feeConfigId = resolved.configId;
      feePercent = resolved.config?.percent ?? null;
      feeFixedCents = resolved.config?.fixedCents ?? null;
      feeSource = resolved.source;
    }

    const { feeCents, netCents } = computeNet(
      input.grossCents,
      input.paymentMethod,
      feeConfig,
    );

    const transaction = await this.transactionRepo.create({
      orgId: input.orgId,
      createdBy,
      description: input.description,
      type: input.type,
      grossCents: input.grossCents,
      feeCents,
      netCents,
      paymentMethod: input.paymentMethod,
      categoryId: input.categoryId ?? null,
      feeConfigId,
      feePercent,
      feeFixedCents,
      feeSource,
      reversesTransactionId: null,
      transactedAt: input.transactedAt,
    });

    await this.auditService.logByAuthId(input.authId, {
      orgId: input.orgId,
      action: "cashier_transaction_created",
      entityType: "transaction",
      entityId: transaction.id,
      metadata: {
        type: input.type,
        grossCents: input.grossCents,
        feeCents,
        netCents,
        feeSource,
        paymentMethod: input.paymentMethod,
        categoryId: input.categoryId ?? null,
        // No caminho de correção, `createdBy` vem de `trustedCreatedBy` (copiado de
        // transactions.created_by da transação original), coluna hoje heterogênea
        // entre auth id e users.id (perna de transferência grava auth id — ver
        // cashier.controller.ts). Não afirmar attributedTo nesse ramo evita
        // propagar essa confusão para o audit log.
        attributedTo: isCorrection ? null : createdBy,
        source: isCorrection ? "correction" : "manual",
        transactedAt: transaction.transactedAt,
      },
    });

    return transaction;
  }
}
