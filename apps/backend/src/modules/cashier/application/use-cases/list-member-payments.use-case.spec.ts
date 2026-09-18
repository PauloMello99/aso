import { ListMemberPaymentsUseCase } from "./list-member-payments.use-case";
import {
  IMemberPaymentRepository,
  MemberPaymentWithMethod,
} from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { PaymentMethod } from "../../domain/transaction.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

// Cenário de referência: dono O, funcionários A e B
// (docs/testing/employee-visibility-tests.md).
function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-O",
    orgId: "org-1",
    userId: "user-O",
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
    findByAuthId: jest.fn(),
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
    userId: "user-A",
    transactionId: "tx-1",
    amountCents: 50000,
    periodStart: null,
    periodEnd: null,
    description: "Pagamento a funcionário",
    reversesPaymentId: null,
    createdBy: "user-O",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberPaymentRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentRepository>> = {},
): jest.Mocked<IMemberPaymentRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrgAndUser: jest.fn().mockResolvedValue([]),
    findReversedIds: jest.fn().mockResolvedValue(new Set<string>()),
    netPaidCents: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
}

// findAllByOrgAndUser devolve MemberPaymentWithMethod (entity + paymentMethod
// vindo do JOIN com transactions, ver member-payment.repository.interface.ts)
// — nao mais MemberPaymentEntity puro.
function buildPaymentWithMethod(
  entity: MemberPaymentEntity,
  paymentMethod: PaymentMethod = "cash",
): MemberPaymentWithMethod {
  return { entity, paymentMethod };
}

describe("ListMemberPaymentsUseCase", () => {
  it("funcionário lendo os próprios pagamentos recebe a lista", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "member-A",
          userId: "user-A",
          role: "employee",
        }),
      ),
    });
    const payment = buildPayment();
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findAllByOrgAndUser: jest
        .fn()
        .mockResolvedValue([buildPaymentWithMethod(payment, "bank_transfer")]),
      findReversedIds: jest.fn().mockResolvedValue(new Set<string>()),
    });
    const useCase = new ListMemberPaymentsUseCase(memberPaymentRepo, memberRepo);

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-A",
      targetUserId: "user-A",
    });

    expect(memberPaymentRepo.findAllByOrgAndUser).toHaveBeenCalledWith(
      "org-1",
      "user-A",
    );
    expect(result).toEqual([
      { entity: payment, reversed: false, paymentMethod: "bank_transfer" },
    ]);
  });

  it("funcionário lendo os pagamentos de OUTRO membro recebe CashierForbiddenException", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "member-A",
          userId: "user-A",
          role: "employee",
        }),
      ),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const useCase = new ListMemberPaymentsUseCase(memberPaymentRepo, memberRepo);

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-A",
        targetUserId: "user-B",
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(memberPaymentRepo.findAllByOrgAndUser).not.toHaveBeenCalled();
  });

  it("owner lendo os pagamentos de qualquer membro recebe a lista", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const payment = buildPayment({ userId: "user-B" });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findAllByOrgAndUser: jest
        .fn()
        .mockResolvedValue([buildPaymentWithMethod(payment)]),
    });
    const useCase = new ListMemberPaymentsUseCase(memberPaymentRepo, memberRepo);

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-B",
    });

    expect(memberPaymentRepo.findAllByOrgAndUser).toHaveBeenCalledWith(
      "org-1",
      "user-B",
    );
    expect(result).toEqual([
      { entity: payment, reversed: false, paymentMethod: "cash" },
    ]);
  });

  it("deriva reversed=true a partir de findReversedIds (org-wide), nunca de um campo mutável na linha", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const original = buildPayment({ id: "payment-original", userId: "user-A" });
    const reversal = buildPayment({
      id: "payment-reversal",
      userId: "user-A",
      reversesPaymentId: "payment-original",
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findAllByOrgAndUser: jest
        .fn()
        .mockResolvedValue([
          buildPaymentWithMethod(original),
          buildPaymentWithMethod(reversal),
        ]),
      findReversedIds: jest
        .fn()
        .mockResolvedValue(new Set<string>(["payment-original"])),
    });
    const useCase = new ListMemberPaymentsUseCase(memberPaymentRepo, memberRepo);

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(result).toEqual([
      { entity: original, reversed: true, paymentMethod: "cash" },
      { entity: reversal, reversed: false, paymentMethod: "cash" },
    ]);
  });
});
