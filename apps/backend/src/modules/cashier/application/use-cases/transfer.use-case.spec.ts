import { TransferUseCase } from "./transfer.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

function buildTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-1",
    orgId: "org-1",
    createdBy: "user-1",
    description: "Transferência (saída)",
    type: "outcome",
    netCents: 5000,
    grossCents: 5000,
    feeCents: 0,
    paymentMethod: "cash",
    categoryId: null,
    reversesTransactionId: null,
    transactedAt: new Date("2026-07-01T10:00:00Z"),
    createdAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-1",
    orgId: "org-1",
    userId: "user-1",
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn().mockResolvedValue(buildTransaction()),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn(),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn(),
    incomeExpenseSeries: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
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

describe("TransferUseCase", () => {
  it("resolve o autor pelo authId e grava o users.id canônico (não o auth id) nas duas pernas", async () => {
    const repo = buildFakeRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ userId: "user-2" })),
    });
    const useCase = new TransferUseCase(repo, memberRepo);

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-user-2",
      fromMethod: "cash",
      toMethod: "bank_transfer",
      amountCents: 5000,
    });

    expect(memberRepo.findByAuthId).toHaveBeenCalledWith("org-1", "auth-user-2");
    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "outcome",
        createdBy: "user-2",
        paymentMethod: "cash",
      }),
    );
    expect(repo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "income",
        createdBy: "user-2",
        paymentMethod: "bank_transfer",
      }),
    );
  });

  it("lança CashierForbiddenException e não movimenta o caixa quando o autor não é membro da org", async () => {
    const repo = buildFakeRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const useCase = new TransferUseCase(repo, memberRepo);

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-stranger",
        fromMethod: "cash",
        toMethod: "bank_transfer",
        amountCents: 5000,
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
