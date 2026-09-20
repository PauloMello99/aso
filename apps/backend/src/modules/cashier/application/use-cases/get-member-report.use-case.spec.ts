import { GetMemberReportUseCase } from "./get-member-report.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { MemberPaymentEntity } from "../../domain/member-payment.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";
import { IMemberDocumentGenerator } from "../../domain/ports/member-document-generator.port";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { MemberReportInvalidPeriodException } from "../../domain/exceptions/member-report-invalid-period.exception";
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
    id: "payment-1",
    orgId: "org-1",
    userId: "user-A",
    transactionId: "tx-1",
    amountCents: 3000,
    periodStart: null,
    periodEnd: null,
    description: null,
    reversesPaymentId: null,
    createdBy: "user-O",
    createdAt: new Date("2026-09-10T10:00:00Z"),
    ...overrides,
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
      (options.payments ?? []).map((entity) => ({
        entity,
        paymentMethod: "cash",
      })),
    ),
    findReversedIds: jest.fn().mockResolvedValue(new Set(options.reversedIds ?? [])),
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
  const serviceRepo = {
    findAllByOrg: jest.fn().mockResolvedValue([]),
    commissionCentsByPeriod: jest.fn().mockResolvedValue(10000),
    memberTotalsByPeriod: jest.fn().mockResolvedValue({
      grossRevenueCents: 20000,
      feesCents: 1000,
      materialCostCents: 0,
    }),
  } as unknown as jest.Mocked<IServiceRepository>;
  const orgRepo = {
    findByIdAndAuthId: jest.fn().mockResolvedValue(
      options.org === undefined
        ? OrgEntity.create({
            id: "org-1",
            name: "Estúdio Ink",
            slug: "ink",
            logoUrl: null,
            role: "owner",
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        : options.org,
    ),
  } as unknown as jest.Mocked<IOrganizationRepository>;
  const generator = {
    generateReceipt: jest.fn(),
    generateReport: jest.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
  } as unknown as jest.Mocked<IMemberDocumentGenerator>;
  const useCase = new GetMemberReportUseCase(
    memberPaymentRepo,
    memberRepo,
    serviceRepo,
    orgRepo,
    generator,
  );
  return { useCase, memberPaymentRepo, serviceRepo, generator };
}

const INPUT = {
  orgId: "org-1",
  authId: "auth-x",
  targetUserId: "user-A",
  from: "2026-09-01",
  to: "2026-09-30",
};

describe("GetMemberReportUseCase", () => {
  it("owner gera o relatório de qualquer membro, escopado ao membro e ao período", async () => {
    const { useCase, serviceRepo, generator } = buildDeps({
      actor: buildMember(),
      payments: [
        buildPayment(),
        buildPayment({
          id: "payment-old",
          createdAt: new Date("2026-08-01T10:00:00Z"),
        }),
      ],
    });

    const result = await useCase.execute(INPUT);

    expect(result.filename).toBe(
      "relatorio-ana-souza-2026-09-01-2026-09-30.pdf",
    );
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(serviceRepo.findAllByOrg).toHaveBeenCalledWith("org-1", {
      performedBy: "user-A",
      from: new Date("2026-09-01T03:00:00.000Z"),
      to: new Date("2026-10-01T02:59:59.999Z"),
    });
    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenCalledWith(
      "org-1",
      new Date("2026-09-01T03:00:00.000Z"),
      new Date("2026-10-01T02:59:59.999Z"),
      "user-A",
    );
    const model = generator.generateReport.mock.calls[0]![0];
    expect(model.payments).toHaveLength(1);
    expect(model.totals).toEqual({
      grossRevenueCents: 20000,
      feesCents: 1000,
      commissionCents: 10000,
      paidNetCents: 3000,
      periodBalanceCents: 7000,
      studioShareCents: 9000,
    });
  });

  it("pagamento estornado é marcado e excluído do total pago", async () => {
    const { useCase, generator } = buildDeps({
      actor: EMPLOYEE_A,
      payments: [buildPayment()],
      reversedIds: ["payment-1"],
    });

    await useCase.execute(INPUT);

    const model = generator.generateReport.mock.calls[0]![0];
    expect(model.payments[0]!.reversed).toBe(true);
    expect(model.totals.paidNetCents).toBe(0);
  });

  it("funcionário pedindo relatório de OUTRO membro recebe CashierForbiddenException", async () => {
    const { useCase, serviceRepo } = buildDeps({ actor: EMPLOYEE_A });

    await expect(
      useCase.execute({ ...INPUT, targetUserId: "user-B" }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(serviceRepo.findAllByOrg).not.toHaveBeenCalled();
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

  it("período inválido (from > to) recebe MemberReportInvalidPeriodException", async () => {
    const { useCase, serviceRepo } = buildDeps({ actor: buildMember() });

    await expect(
      useCase.execute({ ...INPUT, from: "2026-09-30", to: "2026-09-01" }),
    ).rejects.toBeInstanceOf(MemberReportInvalidPeriodException);
    expect(serviceRepo.findAllByOrg).not.toHaveBeenCalled();
  });

  it("janela maior que 366 dias recebe MemberReportInvalidPeriodException", async () => {
    const { useCase } = buildDeps({ actor: buildMember() });

    await expect(
      useCase.execute({ ...INPUT, from: "2024-01-01", to: "2025-01-01" }),
    ).rejects.toBeInstanceOf(MemberReportInvalidPeriodException);
  });
});
