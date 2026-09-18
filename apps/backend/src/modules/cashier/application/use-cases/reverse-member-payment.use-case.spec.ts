import { ReverseMemberPaymentUseCase } from "./reverse-member-payment.use-case";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";
import { MemberPaymentNotReversibleException } from "../../domain/exceptions/member-payment-not-reversible.exception";
import { MemberPaymentAlreadyReversedException } from "../../domain/exceptions/member-payment-already-reversed.exception";

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-owner",
    orgId: "org-1",
    userId: "user-owner",
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Dono",
    userEmail: "dono@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    updateClassification: jest.fn(),
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

function buildPayment(
  overrides: Partial<Parameters<typeof MemberPaymentEntity.create>[0]> = {},
): MemberPaymentEntity {
  return MemberPaymentEntity.create({
    id: "payment-1",
    orgId: "org-1",
    userId: "user-1",
    transactionId: "tx-1",
    amountCents: 54321,
    periodStart: null,
    periodEnd: null,
    description: "Pagamento a funcionário",
    reversesPaymentId: null,
    createdBy: "user-owner",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberPaymentRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentRepository>> = {},
): jest.Mocked<IMemberPaymentRepository> {
  return {
    create: jest.fn().mockResolvedValue(buildPayment()),
    findById: jest.fn().mockResolvedValue(buildPayment()),
    findAllByOrgAndUser: jest.fn(),
    findReversedIds: jest.fn().mockResolvedValue(new Set<string>()),
    netPaidCents: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
}

function buildReversalTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-reversal",
    orgId: "org-1",
    createdBy: "user-owner",
    description: "Estorno: Pagamento a funcionário",
    type: "income",
    netCents: 54321,
    grossCents: 54321,
    feeCents: 0,
    paymentMethod: "bank_transfer",
    categoryId: "cat-reversal",
    reversesTransactionId: "tx-1",
    transactedAt: new Date("2026-09-05T10:00:00Z"),
    createdAt: new Date("2026-09-05T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeReverseTransactionUseCase(
  overrides: Partial<jest.Mocked<ReverseTransactionUseCase>> = {},
): jest.Mocked<ReverseTransactionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(buildReversalTransaction()),
    ...overrides,
  } as unknown as jest.Mocked<ReverseTransactionUseCase>;
}

describe("ReverseMemberPaymentUseCase", () => {
  it("chama ReverseTransactionUseCase na transactionId original e grava a linha com o id da transação de estorno (não a original)", async () => {
    const original = buildPayment();
    const reversalTransaction = buildReversalTransaction();
    const memberRepo = buildFakeMemberRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase({
      execute: jest.fn().mockResolvedValue(reversalTransaction),
    });
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      paymentId: original.id,
      expectedUserId: original.userId,
    });

    expect(reverseTransaction.execute).toHaveBeenCalledWith({
      orgId: "org-1",
      transactionId: original.transactionId,
      authId: "auth-owner",
    });
    const call = memberPaymentRepo.create.mock.calls[0]![0];
    expect(call.transactionId).toBe(reversalTransaction.id);
    expect(call.transactionId).not.toBe(original.transactionId);
    expect(call.reversesPaymentId).toBe(original.id);
  });

  it("copia amountCents e userId do pagamento original (nunca do ator que executa a ação)", async () => {
    const original = buildPayment({ userId: "user-1", amountCents: 54321 });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ memberId: "member-owner", userId: "user-owner" }),
      ),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      paymentId: original.id,
      expectedUserId: original.userId,
    });

    const call = memberPaymentRepo.create.mock.calls[0]![0];
    expect(call.amountCents).toBe(original.amountCents);
    expect(call.userId).toBe(original.userId);
    expect(call.userId).not.toBe("user-owner");
    expect(call.createdBy).toBe("user-owner");
  });

  it("lança CashierForbiddenException quando o ator não é owner, sem chamar o repositório de pagamento", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ memberId: "member-1", userId: "user-1", role: "member" }),
      ),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-1",
        paymentId: "payment-1",
        expectedUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(memberPaymentRepo.findById).not.toHaveBeenCalled();
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentNotFoundException quando o pagamento não existe", async () => {
    const memberRepo = buildFakeMemberRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: "missing",
        expectedUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(MemberPaymentNotFoundException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentNotFoundException quando o paymentId pertence a outro beneficiário (expectedUserId diverge de payment.userId), sem estornar nem gravar", async () => {
    const original = buildPayment({ userId: "user-1" });
    const memberRepo = buildFakeMemberRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: original.id,
        expectedUserId: "user-2",
      }),
    ).rejects.toBeInstanceOf(MemberPaymentNotFoundException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentNotReversibleException (422) ao tentar estornar um estorno", async () => {
    const alreadyReversal = buildPayment({ reversesPaymentId: "payment-original" });
    const memberRepo = buildFakeMemberRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(alreadyReversal),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: alreadyReversal.id,
        expectedUserId: alreadyReversal.userId,
      }),
    ).rejects.toBeInstanceOf(MemberPaymentNotReversibleException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentAlreadyReversedException (409) quando já existe estorno apontando para o pagamento", async () => {
    const original = buildPayment();
    const memberRepo = buildFakeMemberRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversedIds: jest.fn().mockResolvedValue(new Set([original.id])),
    });
    const reverseTransaction = buildFakeReverseTransactionUseCase();
    const useCase = new ReverseMemberPaymentUseCase(
      memberPaymentRepo,
      memberRepo,
      reverseTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: original.id,
        expectedUserId: original.userId,
      }),
    ).rejects.toBeInstanceOf(MemberPaymentAlreadyReversedException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });
});
