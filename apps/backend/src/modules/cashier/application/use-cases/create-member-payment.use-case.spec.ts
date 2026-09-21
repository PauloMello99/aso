import { CreateMemberPaymentUseCase } from "./create-member-payment.use-case";
import { CreateTransactionUseCase } from "./create-transaction.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { TransactionEntity } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { PaymentMemberNotFoundException } from "../../domain/exceptions/payment-member-not-found.exception";
import { MemberPaymentCategoryNotFoundException } from "../../domain/exceptions/member-payment-category-not-found.exception";

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
    findAllByOrg: jest
      .fn()
      .mockResolvedValue([
        buildMember(),
        buildMember({
          memberId: "member-1",
          userId: "user-1",
          role: "member",
          enabled: true,
          userName: "Funcionario",
          userEmail: "funcionario@example.com",
        }),
      ]),
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

function buildCategory(
  overrides: Partial<Parameters<typeof TransactionCategoryEntity.create>[0]> = {},
): TransactionCategoryEntity {
  return TransactionCategoryEntity.create({
    id: "cat-member-payment",
    orgId: "org-1",
    name: "Funcionário",
    isProtected: true,
    systemKey: "member_payment",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeCategoryRepo(
  overrides: Partial<jest.Mocked<ITransactionCategoryRepository>> = {},
): jest.Mocked<ITransactionCategoryRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    findBySystemKey: jest.fn().mockResolvedValue(buildCategory()),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionCategoryRepository>;
}

function buildTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-1",
    orgId: "org-1",
    createdBy: "user-owner",
    description: "Pagamento a funcionário",
    type: "outcome",
    netCents: 50000,
    grossCents: 50000,
    feeCents: 0,
    paymentMethod: "bank_transfer",
    categoryId: "cat-member-payment",
    reversesTransactionId: null,
    transactedAt: new Date("2026-09-01T10:00:00Z"),
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  });
}

function buildPayment(
  overrides: Partial<Parameters<typeof MemberPaymentEntity.create>[0]> = {},
): MemberPaymentEntity {
  return MemberPaymentEntity.create({
    id: "payment-1",
    orgId: "org-1",
    userId: "user-1",
    transactionId: "tx-1",
    amountCents: 50000,
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
    findById: jest.fn(),
    findAllByOrgAndUser: jest.fn(),
    findReversedIds: jest.fn(),
    netPaidCents: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
}

function buildFakeCreateTransactionUseCase(
  overrides: Partial<jest.Mocked<CreateTransactionUseCase>> = {},
): jest.Mocked<CreateTransactionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(buildTransaction()),
    ...overrides,
  } as unknown as jest.Mocked<CreateTransactionUseCase>;
}

describe("CreateMemberPaymentUseCase", () => {
  it("cria a transação outcome com a categoria de pagamento a membro e a linha de pagamento", async () => {
    const payment = buildPayment();
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      create: jest.fn().mockResolvedValue(payment),
    });
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      userId: "user-1",
      amountCents: 50000,
      paymentMethod: "bank_transfer",
      description: "Pagamento a funcionário",
    });

    expect(categoryRepo.findBySystemKey).toHaveBeenCalledWith(
      "org-1",
      "member_payment",
    );
    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        authId: "auth-owner",
        type: "outcome",
        grossCents: 50000,
        paymentMethod: "bank_transfer",
        categoryId: "cat-member-payment",
        description: "Pagamento a Funcionario",
      }),
    );
    expect(memberPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        userId: "user-1",
        transactionId: "tx-1",
        amountCents: 50000,
        description: "Pagamento a funcionário",
        reversesPaymentId: null,
        createdBy: "user-owner",
      }),
    );
    expect(result).toBe(payment);
  });

  it("monta a descrição rica da transação com período e nota, e grava a nota na linha de pagamento", async () => {
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      userId: "user-1",
      amountCents: 50000,
      paymentMethod: "bank_transfer",
      description: "Bônus",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-15",
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Pagamento a Funcionario (01/09/2026 a 15/09/2026) — Bônus",
      }),
    );
    expect(memberPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Bônus",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-15",
      }),
    );
  });

  it("sem observação, a linha de pagamento usa o default e a transação só traz o nome", async () => {
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      userId: "user-1",
      amountCents: 50000,
      paymentMethod: "cash",
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Pagamento a Funcionario" }),
    );
    expect(memberPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Pagamento a funcionário" }),
    );
  });

  it("reflete amountCents 1:1 em grossCents na chamada de CreateTransactionUseCase", async () => {
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      userId: "user-1",
      amountCents: 123456,
      paymentMethod: "cash",
      description: "Pagamento parcial",
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ grossCents: 123456 }),
    );
  });

  it("grava a linha de pagamento com reversesPaymentId null e userId do beneficiário (não do owner)", async () => {
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      userId: "user-1",
      amountCents: 50000,
      paymentMethod: "bank_transfer",
      description: "Pagamento a funcionário",
    });

    const call = memberPaymentRepo.create.mock.calls[0]![0];
    expect(call.userId).toBe("user-1");
    expect(call.userId).not.toBe("user-owner");
    expect(call.reversesPaymentId).toBeNull();
    expect(call.createdBy).toBe("user-owner");
  });

  it("lança CashierForbiddenException quando o ator não é owner", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "member-1",
          userId: "user-1",
          role: "member",
        }),
      ),
    });
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-1",
        userId: "user-2",
        amountCents: 1000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança PaymentMemberNotFoundException quando o beneficiário não existe ou está desabilitado, sem nenhuma escrita", async () => {
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([
          buildMember(),
          buildMember({
            memberId: "member-2",
            userId: "user-2",
            role: "member",
            enabled: false,
          }),
        ]),
    });
    const categoryRepo = buildFakeCategoryRepo();
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        userId: "user-2",
        amountCents: 1000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(PaymentMemberNotFoundException);
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        userId: "user-missing",
        amountCents: 1000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(PaymentMemberNotFoundException);
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentCategoryNotFoundException quando a categoria de sistema não existe, sem chamar CreateTransactionUseCase", async () => {
    const memberRepo = buildFakeMemberRepo();
    const categoryRepo = buildFakeCategoryRepo({
      findBySystemKey: jest.fn().mockResolvedValue(null),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const createTransactionUseCase = buildFakeCreateTransactionUseCase();
    const useCase = new CreateMemberPaymentUseCase(
      memberPaymentRepo,
      categoryRepo,
      memberRepo,
      createTransactionUseCase,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        userId: "user-1",
        amountCents: 1000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(MemberPaymentCategoryNotFoundException);
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(memberPaymentRepo.create).not.toHaveBeenCalled();
  });
});
