import {
  SendCustomerUpdateInviteUseCase,
  SendCustomerUpdateInviteInput,
} from "./send-customer-update-invite.use-case";
import { ICustomerUpdateInvitationRepository } from "../../domain/customer-update-invitation.repository.interface";
import { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";
import { CustomerUpdateInvitationInviteEmailFailedException } from "../../domain/exceptions/customer-update-invitation-invite-email-failed.exception";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { CustomerNotFoundException } from "../../../customers/domain/exceptions/customer-not-found.exception";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";
import type { ConfigService } from "@nestjs/config";

function buildInvitation(
  overrides: Partial<Parameters<typeof CustomerUpdateInvitationEntity.create>[0]> = {},
): CustomerUpdateInvitationEntity {
  return CustomerUpdateInvitationEntity.create({
    id: "invite-1",
    orgId: "org-1",
    customerId: "customer-1",
    token: "token-1",
    status: "pending",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  });
}

function buildCustomer(
  overrides: Partial<Parameters<typeof CustomerEntity.create>[0]> = {},
): CustomerEntity {
  return CustomerEntity.create({
    id: "customer-1",
    orgId: "org-1",
    userId: null,
    originId: null,
    createdBy: "user-1",
    name: "Cliente Teste",
    email: "cliente@example.com",
    phone: null,
    birthDate: "1990-01-01",
    gender: null,
    address: "Rua Teste",
    number: "100",
    addressLine2: null,
    city: "São Paulo",
    state: "SP",
    postalCode: null,
    country: null,
    notes: null,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeUpdateInviteRepo(
  overrides: Partial<jest.Mocked<ICustomerUpdateInvitationRepository>> = {},
): jest.Mocked<ICustomerUpdateInvitationRepository> {
  return {
    create: jest.fn(),
    findPendingByCustomer: jest.fn().mockResolvedValue(null),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerUpdateInvitationRepository>;
}

function buildFakeCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn().mockResolvedValue(buildCustomer()),
    findByEmail: jest.fn(),
    findAllByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(
      MemberEntity.create({
        memberId: "member-1",
        orgId: "org-1",
        userId: "user-1",
        role: "owner",
        enabled: true,
        permissions: [],
        userName: "Profissional",
        userEmail: "profissional@example.com",
        joinedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ),
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

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn().mockResolvedValue(
      OrgEntity.create({
        id: "org-1",
        name: "Estúdio Teste",
        slug: "estudio-teste",
        logoUrl: null,
        role: "owner",
        permissions: [],
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeMail(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendCustomerUpdateLink: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<MailService>;
}

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logByAuthId: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

function buildFakeConfig(): ConfigService {
  return {
    get: jest.fn().mockReturnValue("http://localhost:3000"),
  } as unknown as ConfigService;
}

function buildInput(
  overrides: Partial<SendCustomerUpdateInviteInput> = {},
): SendCustomerUpdateInviteInput {
  return {
    orgId: "org-1",
    authId: "auth-1",
    customerId: "customer-1",
    ...overrides,
  };
}

interface Deps {
  updateInviteRepo: jest.Mocked<ICustomerUpdateInvitationRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  orgRepo: jest.Mocked<IOrganizationRepository>;
  mail: jest.Mocked<MailService>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    updateInviteRepo: buildFakeUpdateInviteRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    orgRepo: buildFakeOrgRepo(),
    mail: buildFakeMail(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SendCustomerUpdateInviteUseCase(
    deps.updateInviteRepo,
    deps.customerRepo,
    deps.memberRepo,
    deps.orgRepo,
    deps.mail,
    buildFakeConfig(),
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SendCustomerUpdateInviteUseCase", () => {
  it("lança OrgNotFoundException quando a organização não é encontrada para o authId", async () => {
    const { useCase, updateInviteRepo } = buildUseCase({
      orgRepo: buildFakeOrgRepo({
        findByIdAndAuthId: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      OrgNotFoundException,
    );
    expect(updateInviteRepo.create).not.toHaveBeenCalled();
  });

  it("lança CustomerNotFoundException quando o cliente não é encontrado, sem escritas", async () => {
    const { useCase, updateInviteRepo, mail } = buildUseCase({
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerNotFoundException,
    );
    expect(updateInviteRepo.create).not.toHaveBeenCalled();
    expect(updateInviteRepo.delete).not.toHaveBeenCalled();
    expect(mail.sendCustomerUpdateLink).not.toHaveBeenCalled();
  });

  it("reaproveita convite pendente não expirado, sem criar novo registro", async () => {
    const pending = buildInvitation({ id: "invite-pending", token: "token-pending" });
    const { useCase, updateInviteRepo, mail, customerRepo } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findPendingByCustomer: jest.fn().mockResolvedValue(pending),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(updateInviteRepo.create).not.toHaveBeenCalled();
    expect(updateInviteRepo.delete).not.toHaveBeenCalled();
    expect(mail.sendCustomerUpdateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.com",
        customerName: "Cliente Teste",
        orgName: "Estúdio Teste",
        fillUrl: expect.stringContaining("/customer-update/token-pending"),
      }),
    );
    expect(customerRepo.findById).toHaveBeenCalledWith(
      "customer-1",
      "org-1",
    );
    expect(result.invitation).toBe(pending);
  });

  it("deleta o convite pendente expirado e cria um novo registro", async () => {
    const expired = buildInvitation({
      id: "invite-expired",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const newInvitation = buildInvitation({ id: "invite-new", token: "token-new" });
    const { useCase, updateInviteRepo } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findPendingByCustomer: jest.fn().mockResolvedValue(expired),
        create: jest.fn().mockResolvedValue(newInvitation),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(updateInviteRepo.delete).toHaveBeenCalledWith("invite-expired");
    expect(updateInviteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        customerId: "customer-1",
        createdBy: "user-1",
      }),
    );
    expect(result.invitation).toBe(newInvitation);
  });

  it("compensa (apaga registro criado) e lança CustomerUpdateInvitationInviteEmailFailedException quando o e-mail falha em caso novo", async () => {
    const newInvitation = buildInvitation({ id: "invite-new" });
    const { useCase, updateInviteRepo } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        create: jest.fn().mockResolvedValue(newInvitation),
      }),
      mail: buildFakeMail({
        sendCustomerUpdateLink: jest
          .fn()
          .mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationInviteEmailFailedException,
    );
    expect(updateInviteRepo.delete).toHaveBeenCalledWith("invite-new");
  });

  it("não compensa (não apaga) quando o e-mail falha reenviando um convite pendente reaproveitado", async () => {
    const pending = buildInvitation({ id: "invite-pending" });
    const { useCase, updateInviteRepo } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findPendingByCustomer: jest.fn().mockResolvedValue(pending),
      }),
      mail: buildFakeMail({
        sendCustomerUpdateLink: jest
          .fn()
          .mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationInviteEmailFailedException,
    );
    expect(updateInviteRepo.delete).not.toHaveBeenCalled();
  });

  it("grava audit log com a action e metadados corretos no caminho feliz", async () => {
    const newInvitation = buildInvitation({ id: "invite-new" });
    const { useCase, auditService } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        create: jest.fn().mockResolvedValue(newInvitation),
      }),
    });

    await useCase.execute(buildInput());

    expect(auditService.log).toHaveBeenCalledWith({
      actorId: "user-1",
      orgId: "org-1",
      action: "customer_update_invite_sent",
      entityType: "customer_update_invitation",
      entityId: "invite-new",
      metadata: { customerId: "customer-1" },
    });
  });
});
