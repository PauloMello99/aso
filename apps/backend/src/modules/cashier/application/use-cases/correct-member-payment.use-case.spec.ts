import { CorrectMemberPaymentUseCase } from "./correct-member-payment.use-case";
import { ReverseMemberPaymentUseCase } from "./reverse-member-payment.use-case";
import { CreateMemberPaymentUseCase } from "./create-member-payment.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";

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
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(buildPayment()),
    findAllByOrgAndUser: jest.fn(),
    findReversedIds: jest.fn(),
    netPaidCents: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
}

describe("CorrectMemberPaymentUseCase", () => {
  it("estorna e relança preservando o beneficiário original (não aceita userId de input)", async () => {
    const original = buildPayment({ userId: "user-1" });
    const reversal = buildPayment({
      id: "payment-2",
      reversesPaymentId: original.id,
    });
    const replacement = buildPayment({ id: "payment-3", amountCents: 30000 });

    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseMemberPayment = {
      execute: jest.fn().mockResolvedValue(reversal),
    } as unknown as jest.Mocked<ReverseMemberPaymentUseCase>;
    const createMemberPayment = {
      execute: jest.fn().mockResolvedValue(replacement),
    } as unknown as jest.Mocked<CreateMemberPaymentUseCase>;

    const useCase = new CorrectMemberPaymentUseCase(
      memberPaymentRepo,
      reverseMemberPayment,
      createMemberPayment,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      paymentId: original.id,
      expectedUserId: original.userId,
      amountCents: 30000,
      paymentMethod: "bank_transfer",
      description: "Pagamento a funcionário (corrigido)",
    });

    expect(reverseMemberPayment.execute).toHaveBeenCalledWith({
      orgId: "org-1",
      authId: "auth-owner",
      paymentId: original.id,
      expectedUserId: original.userId,
    });
    const createCall = createMemberPayment.execute.mock.calls[0]![0];
    expect(createCall.userId).toBe(original.userId);
    expect(createCall.amountCents).toBe(30000);
    expect(createCall.amountCents).not.toBe(original.amountCents);
    expect(result).toEqual({ reversal, replacement });
  });

  it("lança MemberPaymentNotFoundException quando o pagamento não existe, sem estornar nem relançar", async () => {
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const reverseMemberPayment = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReverseMemberPaymentUseCase>;
    const createMemberPayment = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateMemberPaymentUseCase>;

    const useCase = new CorrectMemberPaymentUseCase(
      memberPaymentRepo,
      reverseMemberPayment,
      createMemberPayment,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: "missing",
        expectedUserId: "user-1",
        amountCents: 30000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(MemberPaymentNotFoundException);
    expect(reverseMemberPayment.execute).not.toHaveBeenCalled();
    expect(createMemberPayment.execute).not.toHaveBeenCalled();
  });

  it("lança MemberPaymentNotFoundException quando o paymentId pertence a outro beneficiário (expectedUserId diverge de original.userId), sem estornar nem relançar", async () => {
    const original = buildPayment({ userId: "user-1" });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseMemberPayment = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReverseMemberPaymentUseCase>;
    const createMemberPayment = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateMemberPaymentUseCase>;

    const useCase = new CorrectMemberPaymentUseCase(
      memberPaymentRepo,
      reverseMemberPayment,
      createMemberPayment,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-owner",
        paymentId: original.id,
        expectedUserId: "user-2",
        amountCents: 30000,
        paymentMethod: "cash",
        description: "x",
      }),
    ).rejects.toBeInstanceOf(MemberPaymentNotFoundException);
    expect(reverseMemberPayment.execute).not.toHaveBeenCalled();
    expect(createMemberPayment.execute).not.toHaveBeenCalled();
  });

  it("gera exatamente 2 escritas de pagamento (1 estorno via ReverseMemberPaymentUseCase + 1 relançamento via CreateMemberPaymentUseCase)", async () => {
    const original = buildPayment();
    const reversal = buildPayment({ id: "payment-2", reversesPaymentId: original.id });
    const replacement = buildPayment({ id: "payment-3", amountCents: 30000 });

    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const reverseMemberPayment = {
      execute: jest.fn().mockResolvedValue(reversal),
    } as unknown as jest.Mocked<ReverseMemberPaymentUseCase>;
    const createMemberPayment = {
      execute: jest.fn().mockResolvedValue(replacement),
    } as unknown as jest.Mocked<CreateMemberPaymentUseCase>;

    const useCase = new CorrectMemberPaymentUseCase(
      memberPaymentRepo,
      reverseMemberPayment,
      createMemberPayment,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
      paymentId: original.id,
      expectedUserId: original.userId,
      amountCents: 30000,
      paymentMethod: "cash",
      description: "x",
    });

    // Cada sub-use-case grava exatamente 1 linha (coberto pelos specs de
    // ReverseMemberPaymentUseCase e CreateMemberPaymentUseCase) — aqui
    // confirmamos que CorrectMemberPaymentUseCase chama exatamente 1 vez
    // cada um, nunca mais (a linha original nunca e tocada de novo).
    expect(reverseMemberPayment.execute).toHaveBeenCalledTimes(1);
    expect(createMemberPayment.execute).toHaveBeenCalledTimes(1);
  });
});
