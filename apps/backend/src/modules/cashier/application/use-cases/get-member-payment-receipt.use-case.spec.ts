import { GetMemberPaymentReceiptUseCase } from "./get-member-payment-receipt.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { IMemberDocumentGenerator } from "../../domain/ports/member-document-generator.port";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { MemberPaymentNotFoundException } from "../../domain/exceptions/member-payment-not-found.exception";
import { PaymentMemberNotFoundException } from "../../domain/exceptions/payment-member-not-found.exception";

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

const EMPLOYEE_A = buildMember({
  memberId: "member-A",
  userId: "user-A",
  role: "employee",
  userName: "Ana Souza",
  userEmail: "ana@example.com",
});

function buildPayment(
  overrides: Partial<Parameters<typeof MemberPaymentEntity.create>[0]> = {},
): MemberPaymentEntity {
  return MemberPaymentEntity.create({
    id: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
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

function buildOrg(): OrgEntity {
  return OrgEntity.create({
    id: "org-1",
    name: "Estúdio Ink",
    slug: "ink",
    logoUrl: null,
    role: "owner",
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildDeps(options: {
  actor: MemberEntity | null;
  members?: MemberEntity[];
  payments?: MemberPaymentEntity[];
  reversedIds?: string[];
  org?: OrgEntity | null;
}) {
  const memberRepo = {
    findByAuthId: jest.fn().mockResolvedValue(options.actor),
    findAllByOrg: jest
      .fn()
      .mockResolvedValue(options.members ?? [buildMember(), EMPLOYEE_A]),
  } as unknown as jest.Mocked<IMemberRepository>;
  const memberPaymentRepo = {
    findAllByOrgAndUser: jest.fn().mockResolvedValue(
      (options.payments ?? [buildPayment()]).map((entity) => ({
        entity,
        paymentMethod: "bank_transfer",
      })),
    ),
    findReversedIds: jest.fn().mockResolvedValue(new Set(options.reversedIds ?? [])),
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
  const orgRepo = {
    findByIdAndAuthId: jest
      .fn()
      .mockResolvedValue(options.org === undefined ? buildOrg() : options.org),
  } as unknown as jest.Mocked<IOrganizationRepository>;
  const generator = {
    generateReceipt: jest.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
    generateReport: jest.fn(),
  } as unknown as jest.Mocked<IMemberDocumentGenerator>;
  const useCase = new GetMemberPaymentReceiptUseCase(
    memberPaymentRepo,
    memberRepo,
    orgRepo,
    generator,
  );
  return { useCase, memberRepo, memberPaymentRepo, orgRepo, generator };
}

const INPUT = {
  orgId: "org-1",
  authId: "auth-x",
  targetUserId: "user-A",
  paymentId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
};

describe("GetMemberPaymentReceiptUseCase", () => {
  it("owner gera o recibo de qualquer membro", async () => {
    const { useCase, generator, memberPaymentRepo } = buildDeps({
      actor: buildMember(),
    });

    const result = await useCase.execute(INPUT);

    expect(memberPaymentRepo.findAllByOrgAndUser).toHaveBeenCalledWith(
      "org-1",
      "user-A",
    );
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toMatch(
      /^recibo-pagamento-ana-souza-\d{4}-\d{2}-\d{2}-3f1e8c9a\.pdf$/,
    );
    expect(generator.generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        studioName: "Estúdio Ink",
        memberName: "Ana Souza",
        memberEmail: "ana@example.com",
        amountCents: 50000,
        paymentMethod: "bank_transfer",
        reversed: false,
      }),
    );
  });

  it("funcionário gera o recibo do PRÓPRIO pagamento", async () => {
    const { useCase } = buildDeps({ actor: EMPLOYEE_A });

    await expect(useCase.execute(INPUT)).resolves.toBeDefined();
  });

  it("funcionário pedindo recibo de OUTRO membro recebe CashierForbiddenException", async () => {
    const { useCase, memberPaymentRepo, generator } = buildDeps({
      actor: EMPLOYEE_A,
    });

    await expect(
      useCase.execute({ ...INPUT, targetUserId: "user-B" }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(memberPaymentRepo.findAllByOrgAndUser).not.toHaveBeenCalled();
    expect(generator.generateReceipt).not.toHaveBeenCalled();
  });

  it("quem não é membro da org recebe CashierForbiddenException", async () => {
    const { useCase } = buildDeps({ actor: null });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      CashierForbiddenException,
    );
  });

  it("beneficiário que não é membro da org recebe PaymentMemberNotFoundException", async () => {
    const { useCase } = buildDeps({ actor: buildMember(), members: [buildMember()] });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      PaymentMemberNotFoundException,
    );
  });

  it("pagamento inexistente / de outro membro / de outra org (fora da consulta org+user) vira MemberPaymentNotFoundException", async () => {
    const { useCase } = buildDeps({
      actor: buildMember(),
      payments: [buildPayment({ id: "outro-pagamento" })],
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      MemberPaymentNotFoundException,
    );
  });

  it("linha de estorno não tem recibo (MemberPaymentNotFoundException)", async () => {
    const { useCase } = buildDeps({
      actor: buildMember(),
      payments: [buildPayment({ reversesPaymentId: "original" })],
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      MemberPaymentNotFoundException,
    );
  });

  it("pagamento estornado é marcado com a data do estorno", async () => {
    const { useCase, generator } = buildDeps({
      actor: buildMember(),
      payments: [
        buildPayment(),
        buildPayment({
          id: "payment-rev",
          reversesPaymentId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
          createdAt: new Date("2026-09-10T10:00:00Z"),
        }),
      ],
      reversedIds: ["3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f"],
    });

    await useCase.execute(INPUT);

    expect(generator.generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        reversed: true,
        reversedAt: new Date("2026-09-10T10:00:00Z"),
      }),
    );
  });
});
