import { UpsertMemberPaymentFeesUseCase } from "./upsert-member-payment-fees.use-case";
import { IMemberPaymentFeeRepository } from "../../domain/member-payment-fee.repository.interface";
import { MemberPaymentFeeEntity } from "../../domain/member-payment-fee.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { FeeMemberNotFoundException } from "../../domain/exceptions/fee-member-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

function buildFee(
  overrides: Partial<Parameters<typeof MemberPaymentFeeEntity.create>[0]> = {},
): MemberPaymentFeeEntity {
  return MemberPaymentFeeEntity.create({
    id: "fee-1",
    orgId: "org-1",
    userId: "user-1",
    paymentMethod: "credit_card",
    percent: "3.50",
    fixedCents: 0,
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
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
    supersede: jest.fn().mockResolvedValue(buildFee()),
    deactivate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentFeeRepository>;
}

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn().mockResolvedValue([buildMember()]),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest
      .fn()
      .mockResolvedValue(buildMember({ userId: "owner-1", role: "owner" })),
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

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

describe("UpsertMemberPaymentFeesUseCase", () => {
  it("lança CashierForbiddenException quando o autor não é owner e nunca chama supersede nem audita", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const orgRepo = buildFakeOrgRepo({
      isOwner: jest.fn().mockResolvedValue(false),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "not-owner",
        fees: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            percent: "4.00",
            fixedCents: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("lança FeeMemberNotFoundException quando userId não pertence à organização, sem inspecionar nem superseder nenhum item do payload", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "user-1" })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "owner-1",
        fees: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            percent: "4.00",
            fixedCents: 0,
          },
          {
            userId: "user-outsider",
            paymentMethod: "credit_card",
            percent: "4.00",
            fixedCents: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(FeeMemberNotFoundException);
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("lança FeeMemberNotFoundException quando userId pertence a membro desativado da org, sem chamar supersede", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "user-1", enabled: false })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "owner-1",
        fees: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            percent: "4.00",
            fixedCents: 0,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(FeeMemberNotFoundException);
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("não chama supersede nem audita quando percent e fixedCents enviados são idênticos aos vigentes", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(
          buildFee({ userId: "user-1", percent: "3.50", fixedCents: 0 }),
        ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        {
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "3.5",
          fixedCents: 0,
        },
      ],
    });

    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("chama supersede com os dados normalizados e audita com metadata.scope === 'member' capturando previousPercent/previousFixedCents", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(
          buildFee({ userId: "user-1", percent: "3.50", fixedCents: 100 }),
        ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        {
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "4.00",
          fixedCents: 150,
        },
      ],
    });

    expect(memberFeeRepo.supersede).toHaveBeenCalledTimes(1);
    expect(memberFeeRepo.supersede).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      paymentMethod: "credit_card",
      percent: "4.00",
      fixedCents: 150,
      createdBy: "owner-1",
    });
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_fees_updated",
      entityType: "member_payment_fees",
      entityId: "org-1",
      metadata: {
        scope: "member",
        changes: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            previousPercent: "3.50",
            previousFixedCents: 100,
            percent: "4.00",
            fixedCents: 150,
          },
        ],
      },
    });
  });

  it("com payload misto, faz supersede só do item alterado e audita apenas esse item", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest.fn().mockImplementation(
        (_orgId: string, userId: string, paymentMethod: string) => {
          if (userId === "user-1" && paymentMethod === "credit_card") {
            return Promise.resolve(
              buildFee({ userId: "user-1", percent: "3.50", fixedCents: 0 }),
            );
          }
          if (userId === "user-2" && paymentMethod === "debit_card") {
            return Promise.resolve(
              buildFee({
                userId: "user-2",
                paymentMethod: "debit_card",
                percent: "2.00",
                fixedCents: 0,
              }),
            );
          }
          return Promise.resolve(null);
        },
      ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([
          buildMember({ userId: "user-1" }),
          buildMember({ memberId: "member-2", userId: "user-2" }),
        ]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        {
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "5.00",
          fixedCents: 0,
        },
        {
          userId: "user-2",
          paymentMethod: "debit_card",
          percent: "2.00",
          fixedCents: 0,
        },
      ],
    });

    expect(memberFeeRepo.supersede).toHaveBeenCalledTimes(1);
    expect(memberFeeRepo.supersede).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      paymentMethod: "credit_card",
      percent: "5.00",
      fixedCents: 0,
      createdBy: "owner-1",
    });
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_fees_updated",
      entityType: "member_payment_fees",
      entityId: "org-1",
      metadata: {
        scope: "member",
        changes: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            previousPercent: "3.50",
            previousFixedCents: 0,
            percent: "5.00",
            fixedCents: 0,
          },
        ],
      },
    });
  });

  it("desativa o override ativo listado em deactivations e audita a remoção com percent/fixedCents null, sem chamar supersede", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(
          buildFee({ userId: "user-1", percent: "3.50", fixedCents: 100 }),
        ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [],
      deactivations: [{ userId: "user-1", paymentMethod: "credit_card" }],
    });

    expect(memberFeeRepo.deactivate).toHaveBeenCalledTimes(1);
    expect(memberFeeRepo.deactivate).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "credit_card",
    );
    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_fees_updated",
      entityType: "member_payment_fees",
      entityId: "org-1",
      metadata: {
        scope: "member",
        changes: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            previousPercent: "3.50",
            previousFixedCents: 100,
            percent: null,
            fixedCents: null,
          },
        ],
      },
    });
  });

  it("não chama deactivate nem audita quando o item de deactivations não tem override ativo", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [],
      deactivations: [{ userId: "user-1", paymentMethod: "credit_card" }],
    });

    expect(memberFeeRepo.deactivate).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("lança FeeMemberNotFoundException quando um item de deactivations não pertence à org, sem ler nem desativar nada", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo();
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "user-1" })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "owner-1",
        fees: [],
        deactivations: [
          { userId: "user-outsider", paymentMethod: "credit_card" },
        ],
      }),
    ).rejects.toBeInstanceOf(FeeMemberNotFoundException);
    expect(memberFeeRepo.findActiveByOrgUserAndMethod).not.toHaveBeenCalled();
    expect(memberFeeRepo.deactivate).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("com payload misto (fees altera um item + deactivations remove outro), aplica ambos e audita uma vez com os dois changes na ordem fees→deactivations", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockImplementation(
          (_orgId: string, userId: string, paymentMethod: string) => {
            if (userId === "user-1" && paymentMethod === "credit_card") {
              return Promise.resolve(
                buildFee({ userId: "user-1", percent: "3.50", fixedCents: 0 }),
              );
            }
            if (userId === "user-2" && paymentMethod === "debit_card") {
              return Promise.resolve(
                buildFee({
                  userId: "user-2",
                  paymentMethod: "debit_card",
                  percent: "2.00",
                  fixedCents: 50,
                }),
              );
            }
            return Promise.resolve(null);
          },
        ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([
          buildMember({ userId: "user-1" }),
          buildMember({ memberId: "member-2", userId: "user-2" }),
        ]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        {
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "5.00",
          fixedCents: 0,
        },
      ],
      deactivations: [{ userId: "user-2", paymentMethod: "debit_card" }],
    });

    expect(memberFeeRepo.supersede).toHaveBeenCalledTimes(1);
    expect(memberFeeRepo.deactivate).toHaveBeenCalledTimes(1);
    expect(memberFeeRepo.deactivate).toHaveBeenCalledWith(
      "org-1",
      "user-2",
      "debit_card",
    );
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_fees_updated",
      entityType: "member_payment_fees",
      entityId: "org-1",
      metadata: {
        scope: "member",
        changes: [
          {
            userId: "user-1",
            paymentMethod: "credit_card",
            previousPercent: "3.50",
            previousFixedCents: 0,
            percent: "5.00",
            fixedCents: 0,
          },
          {
            userId: "user-2",
            paymentMethod: "debit_card",
            previousPercent: "2.00",
            previousFixedCents: 50,
            percent: null,
            fixedCents: null,
          },
        ],
      },
    });
  });

  it("com deactivations ausente, mantém o comportamento atual (nenhuma remoção, sem chamar deactivate)", async () => {
    const memberFeeRepo = buildFakeMemberFeeRepo({
      findActiveByOrgUserAndMethod: jest
        .fn()
        .mockResolvedValue(
          buildFee({ userId: "user-1", percent: "3.50", fixedCents: 0 }),
        ),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberPaymentFeesUseCase(
      memberFeeRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      fees: [
        {
          userId: "user-1",
          paymentMethod: "credit_card",
          percent: "3.5",
          fixedCents: 0,
        },
      ],
    });

    expect(memberFeeRepo.deactivate).not.toHaveBeenCalled();
    expect(memberFeeRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });
});
