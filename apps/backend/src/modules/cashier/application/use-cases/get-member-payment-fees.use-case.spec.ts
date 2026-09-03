import { GetMemberPaymentFeesUseCase } from "./get-member-payment-fees.use-case";
import { IMemberPaymentFeeRepository } from "../../domain/member-payment-fee.repository.interface";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import { IPaymentFeeRepository } from "../../domain/payment-fee.repository.interface";
import { PaymentFeeEntity } from "../../domain/payment-fee.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

function buildMemberFee(
  overrides: Partial<Parameters<typeof MemberPaymentFeeEntity.create>[0]> = {},
): MemberPaymentFeeEntity {
  return MemberPaymentFeeEntity.create({
    id: "member-fee-1",
    orgId: "org-1",
    userId: "user-1",
    paymentMethod: "credit_card",
    percent: "3.50",
    fixedCents: 50,
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildOrgFee(
  overrides: Partial<Parameters<typeof PaymentFeeEntity.create>[0]> = {},
): PaymentFeeEntity {
  return PaymentFeeEntity.create({
    id: "org-fee-1",
    orgId: "org-1",
    paymentMethod: "credit_card",
    percent: "2.00",
    fixedCents: 10,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
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
    role: "employee",
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberFeeRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentFeeRepository>> = {},
): jest.Mocked<IMemberPaymentFeeRepository> {
  return {
    findActiveByOrg: jest.fn().mockResolvedValue([]),
    findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
    supersede: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentFeeRepository>;
}

function buildFakeOrgFeeRepo(
  overrides: Partial<jest.Mocked<IPaymentFeeRepository>> = {},
): jest.Mocked<IPaymentFeeRepository> {
  return {
    findByOrg: jest.fn().mockResolvedValue([]),
    findByOrgAndMethod: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentFeeRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(null),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

const OWNER = buildMember({
  memberId: "member-owner",
  userId: "owner-1",
  role: "owner",
  userName: "Dona",
});

describe("GetMemberPaymentFeesUseCase", () => {
  it("membro com override: source 'member', configured true, números do override", async () => {
    const employee = buildMember({ userId: "user-1" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(OWNER),
      findAllByOrg: jest.fn().mockResolvedValue([OWNER, employee]),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrg: jest.fn().mockResolvedValue([
        buildMemberFee({
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "3.50",
          fixedCents: 50,
        }),
      ]),
    });
    const orgFeeRepo = buildFakeOrgFeeRepo();
    const useCase = new GetMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgFeeRepo,
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
    });

    const row = result.find(
      (r) => r.userId === "user-1" && r.paymentMethod === "credit_card",
    );
    expect(row).toEqual(
      expect.objectContaining({
        userId: "user-1",
        paymentMethod: "credit_card",
        percent: "3.50",
        fixedCents: 50,
        source: "member",
        configured: true,
      }),
    );
  });

  it("membro sem override e org configurada para o método: source 'org', configured false, números da org", async () => {
    const employee = buildMember({ userId: "user-1" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(OWNER),
      findAllByOrg: jest.fn().mockResolvedValue([OWNER, employee]),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const orgFeeRepo = buildFakeOrgFeeRepo({
      findByOrg: jest.fn().mockResolvedValue([
        buildOrgFee({
          paymentMethod: "credit_card",
          percent: "2.00",
          fixedCents: 10,
        }),
      ]),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgFeeRepo,
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
    });

    const row = result.find(
      (r) => r.userId === "user-1" && r.paymentMethod === "credit_card",
    );
    expect(row).toEqual(
      expect.objectContaining({
        percent: "2.00",
        fixedCents: 10,
        source: "org",
        configured: false,
      }),
    );
  });

  it("nem override nem org: source 'none', percent '0.00', fixedCents 0, configured false", async () => {
    const employee = buildMember({ userId: "user-1" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(OWNER),
      findAllByOrg: jest.fn().mockResolvedValue([OWNER, employee]),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      buildFakeMemberFeeRepo(),
      buildFakeOrgFeeRepo(),
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
    });

    const row = result.find(
      (r) => r.userId === "user-1" && r.paymentMethod === "debit_card",
    );
    expect(row).toEqual(
      expect.objectContaining({
        percent: "0.00",
        fixedCents: 0,
        source: "none",
        configured: false,
      }),
    );
  });

  it("funcionário comum: recebe apenas as próprias linhas, nunca as de colegas", async () => {
    const employee1 = buildMember({ userId: "user-1" });
    const employee2 = buildMember({
      memberId: "member-2",
      userId: "user-2",
      userName: "Ciclano",
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(employee1),
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([OWNER, employee1, employee2]),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      buildFakeMemberFeeRepo(),
      buildFakeOrgFeeRepo(),
      memberRepo,
    );

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.userId === "user-1")).toBe(true);
    expect(result.map((r) => r.paymentMethod).sort()).toEqual([
      "credit_card",
      "debit_card",
    ]);
  });

  it("owner: recebe linhas de todos os membros enabled (uma por método elegível)", async () => {
    const employee1 = buildMember({ userId: "user-1" });
    const employee2 = buildMember({
      memberId: "member-2",
      userId: "user-2",
      userName: "Ciclano",
    });
    const disabled = buildMember({
      memberId: "member-3",
      userId: "user-3",
      userName: "Beltrano",
      enabled: false,
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(OWNER),
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([OWNER, employee1, employee2, disabled]),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      buildFakeMemberFeeRepo(),
      buildFakeOrgFeeRepo(),
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
    });

    expect(result).toHaveLength(6);
    expect([...new Set(result.map((r) => r.userId))].sort()).toEqual(
      ["owner-1", "user-1", "user-2"].sort(),
    );
    expect(result.some((r) => r.userId === "user-3")).toBe(false);
  });

  it("override com percent '0.00' / fixedCents 0: continua source 'member' e configured true", async () => {
    const employee = buildMember({ userId: "user-1" });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(OWNER),
      findAllByOrg: jest.fn().mockResolvedValue([OWNER, employee]),
    });
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrg: jest.fn().mockResolvedValue([
        buildMemberFee({
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "0.00",
          fixedCents: 0,
        }),
      ]),
    });
    const orgFeeRepo = buildFakeOrgFeeRepo({
      findByOrg: jest.fn().mockResolvedValue([
        buildOrgFee({
          paymentMethod: "credit_card",
          percent: "2.00",
          fixedCents: 10,
        }),
      ]),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgFeeRepo,
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-owner",
    });

    const row = result.find(
      (r) => r.userId === "user-1" && r.paymentMethod === "credit_card",
    );
    expect(row).toEqual(
      expect.objectContaining({
        percent: "0.00",
        fixedCents: 0,
        source: "member",
        configured: true,
      }),
    );
  });

  it("lança CashierForbiddenException quando o ator não é membro da org", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const useCase = new GetMemberPaymentFeesUseCase(
      buildFakeMemberFeeRepo(),
      buildFakeOrgFeeRepo(),
      memberRepo,
    );

    await expect(
      useCase.execute({ orgId: "org-1", authId: "stranger" }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
  });
});
