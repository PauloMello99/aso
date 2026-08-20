import {
  SendCustomerSelfRegistrationInviteUseCase,
  SendCustomerSelfRegistrationInviteInput,
} from "./send-customer-self-registration-invite.use-case";
import { ICustomerSelfRegistrationRepository } from "../../domain/customer-self-registration.repository.interface";
import { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import { CustomerSelfRegistrationInviteEmailFailedException } from "../../domain/exceptions/customer-self-registration-invite-email-failed.exception";
import { IAnamnesisResponseRepository } from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import { AnamnesisResponseEntity } from "../../../anamnesis/domain/anamnesis-response.entity";
import { AnamnesisFormNotConfiguredException } from "../../../anamnesis/domain/exceptions/anamnesis-form-not-configured.exception";
import { AnamnesisFormVersionEntity } from "../../../anamnesis/domain/anamnesis-form-version.entity";
import { GetCurrentAnamnesisFormVersionUseCase } from "../../../anamnesis/application/use-cases/get-current-anamnesis-form-version.use-case";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { CustomerEmailAlreadyExistsException } from "../../../customers/domain/exceptions/customer-email-already-exists.exception";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { OrgEntity } from "../../../organizations/domain/org.entity";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";
import type { ConfigService } from "@nestjs/config";

const questions: AnamnesisFormVersionEntity["questions"] = [
  { id: "q-1", type: "text", label: "Alergias?", required: true },
];

function buildRegistration(
  overrides: Partial<Parameters<typeof CustomerSelfRegistrationEntity.create>[0]> = {},
): CustomerSelfRegistrationEntity {
  return CustomerSelfRegistrationEntity.create({
    id: "reg-1",
    orgId: "org-1",
    serviceTypeId: "type-1",
    email: "novo@example.com",
    token: "token-1",
    anamnesisResponseId: "response-1",
    customerId: null,
    status: "pending",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  });
}

function buildAnamnesisResponse(
  overrides: Partial<Parameters<typeof AnamnesisResponseEntity.create>[0]> = {},
): AnamnesisResponseEntity {
  return AnamnesisResponseEntity.create({
    id: "response-new",
    orgId: "org-1",
    formVersionId: "version-1",
    serviceTypeId: "type-1",
    customerId: null,
    questionsSnapshot: questions,
    token: "token-response",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    status: "pending",
    answers: null,
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFormVersion(
  overrides: Partial<Parameters<typeof AnamnesisFormVersionEntity.create>[0]> = {},
): AnamnesisFormVersionEntity {
  return AnamnesisFormVersionEntity.create({
    id: "version-1",
    formId: "form-1",
    orgId: "org-1",
    versionNumber: 1,
    questions,
    createdBy: "user-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeSelfRegRepo(
  overrides: Partial<jest.Mocked<ICustomerSelfRegistrationRepository>> = {},
): jest.Mocked<ICustomerSelfRegistrationRepository> {
  return {
    create: jest.fn(),
    findPendingByEmail: jest.fn().mockResolvedValue(null),
    delete: jest.fn(),
    findByToken: jest.fn(),
    linkCustomer: jest.fn(),
    markSubmitted: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerSelfRegistrationRepository>;
}

function buildFakeAnamnesisResponseRepo(
  overrides: Partial<jest.Mocked<IAnamnesisResponseRepository>> = {},
): jest.Mocked<IAnamnesisResponseRepository> {
  return {
    create: jest.fn(),
    deletePendingFor: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn(),
    findById: jest.fn(),
    findLinkable: jest.fn(),
    listByOrg: jest.fn(),
    findDetailById: jest.fn(),
    linkCustomer: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisResponseRepository>;
}

function buildFakeCustomerRepo(
  overrides: Partial<jest.Mocked<ICustomerRepository>> = {},
): jest.Mocked<ICustomerRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
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

function buildFakeGetCurrentVersion(
  overrides: Partial<jest.Mocked<GetCurrentAnamnesisFormVersionUseCase>> = {},
): jest.Mocked<GetCurrentAnamnesisFormVersionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(buildFormVersion()),
    ...overrides,
  } as unknown as jest.Mocked<GetCurrentAnamnesisFormVersionUseCase>;
}

function buildFakeMail(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendCustomerSelfRegistrationLink: jest.fn().mockResolvedValue(true),
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
  overrides: Partial<SendCustomerSelfRegistrationInviteInput> = {},
): SendCustomerSelfRegistrationInviteInput {
  return {
    orgId: "org-1",
    authId: "auth-1",
    email: "novo@example.com",
    serviceTypeId: "type-1",
    ...overrides,
  };
}

interface Deps {
  selfRegRepo: jest.Mocked<ICustomerSelfRegistrationRepository>;
  anamnesisResponseRepo: jest.Mocked<IAnamnesisResponseRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  orgRepo: jest.Mocked<IOrganizationRepository>;
  getCurrentVersion: jest.Mocked<GetCurrentAnamnesisFormVersionUseCase>;
  mail: jest.Mocked<MailService>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    selfRegRepo: buildFakeSelfRegRepo(),
    anamnesisResponseRepo: buildFakeAnamnesisResponseRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    orgRepo: buildFakeOrgRepo(),
    getCurrentVersion: buildFakeGetCurrentVersion(),
    mail: buildFakeMail(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SendCustomerSelfRegistrationInviteUseCase(
    deps.selfRegRepo,
    deps.anamnesisResponseRepo,
    deps.customerRepo,
    deps.memberRepo,
    deps.orgRepo,
    deps.getCurrentVersion,
    deps.mail,
    buildFakeConfig(),
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SendCustomerSelfRegistrationInviteUseCase", () => {
  it("lança OrgNotFoundException quando a organização não é encontrada para o authId", async () => {
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      orgRepo: buildFakeOrgRepo({
        findByIdAndAuthId: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      OrgNotFoundException,
    );
    expect(selfRegRepo.create).not.toHaveBeenCalled();
    expect(anamnesisResponseRepo.create).not.toHaveBeenCalled();
  });

  it("lança CustomerEmailAlreadyExistsException quando o e-mail já pertence a um cliente cadastrado", async () => {
    const { useCase, customerRepo, selfRegRepo, anamnesisResponseRepo } =
      buildUseCase({
        customerRepo: buildFakeCustomerRepo({
          findByEmail: jest.fn().mockResolvedValue(
            CustomerEntity.create({
              id: "customer-1",
              orgId: "org-1",
              userId: null,
              originId: null,
              createdBy: "user-1",
              name: "Cliente",
              email: "novo@example.com",
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
            }),
          ),
        }),
      });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerEmailAlreadyExistsException,
    );
    expect(customerRepo.findByEmail).toHaveBeenCalledWith(
      "org-1",
      "novo@example.com",
    );
    expect(selfRegRepo.create).not.toHaveBeenCalled();
    expect(anamnesisResponseRepo.create).not.toHaveBeenCalled();
  });

  it("lança AnamnesisFormNotConfiguredException quando não há ficha configurada para o serviceTypeId", async () => {
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      getCurrentVersion: buildFakeGetCurrentVersion({
        execute: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisFormNotConfiguredException,
    );
    expect(selfRegRepo.create).not.toHaveBeenCalled();
    expect(anamnesisResponseRepo.create).not.toHaveBeenCalled();
  });

  it("reaproveita convite pendente não expirado, sem criar resposta ou registro novos", async () => {
    const pending = buildRegistration({ id: "reg-pending", token: "token-pending" });
    const { useCase, selfRegRepo, anamnesisResponseRepo, mail } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findPendingByEmail: jest.fn().mockResolvedValue(pending),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(anamnesisResponseRepo.create).not.toHaveBeenCalled();
    expect(selfRegRepo.create).not.toHaveBeenCalled();
    expect(selfRegRepo.delete).not.toHaveBeenCalled();
    expect(mail.sendCustomerSelfRegistrationLink).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "novo@example.com",
        fillUrl: expect.stringContaining("token-pending"),
      }),
    );
    expect(result.registration).toBe(pending);
  });

  it("deleta o convite pendente com serviceTypeId diferente e cria um novo registro/resposta (não reaproveita)", async () => {
    const pendingOtherServiceType = buildRegistration({
      id: "reg-other-service-type",
      serviceTypeId: "type-other",
    });
    const newResponse = buildAnamnesisResponse();
    const newRegistration = buildRegistration({ id: "reg-new", token: "token-new" });
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findPendingByEmail: jest.fn().mockResolvedValue(pendingOtherServiceType),
        create: jest.fn().mockResolvedValue(newRegistration),
      }),
      anamnesisResponseRepo: buildFakeAnamnesisResponseRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput({ serviceTypeId: "type-1" }));

    expect(selfRegRepo.delete).toHaveBeenCalledWith("reg-other-service-type");
    expect(anamnesisResponseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        serviceTypeId: "type-1",
      }),
    );
    expect(selfRegRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        email: "novo@example.com",
        serviceTypeId: "type-1",
        anamnesisResponseId: "response-new",
      }),
    );
    expect(result.registration).toBe(newRegistration);
  });

  it("deleta o convite pendente expirado e cria um novo registro/resposta", async () => {
    const expired = buildRegistration({
      id: "reg-expired",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const newResponse = buildAnamnesisResponse();
    const newRegistration = buildRegistration({ id: "reg-new", token: "token-new" });
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findPendingByEmail: jest.fn().mockResolvedValue(expired),
        create: jest.fn().mockResolvedValue(newRegistration),
      }),
      anamnesisResponseRepo: buildFakeAnamnesisResponseRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(selfRegRepo.delete).toHaveBeenCalledWith("reg-expired");
    expect(anamnesisResponseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        serviceTypeId: "type-1",
        customerId: null,
        createdBy: "user-1",
      }),
    );
    expect(selfRegRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        email: "novo@example.com",
        serviceTypeId: "type-1",
        anamnesisResponseId: "response-new",
        createdBy: "user-1",
      }),
    );
    expect(result.registration).toBe(newRegistration);
  });

  it("compensa (apaga registro criado) e lança CustomerSelfRegistrationInviteEmailFailedException quando o e-mail falha em caso novo", async () => {
    const newResponse = buildAnamnesisResponse();
    const newRegistration = buildRegistration({ id: "reg-new" });
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        create: jest.fn().mockResolvedValue(newRegistration),
      }),
      anamnesisResponseRepo: buildFakeAnamnesisResponseRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
      mail: buildFakeMail({
        sendCustomerSelfRegistrationLink: jest
          .fn()
          .mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationInviteEmailFailedException,
    );
    expect(selfRegRepo.delete).toHaveBeenCalledWith("reg-new");
    expect(anamnesisResponseRepo.delete).toHaveBeenCalledWith("response-new");
  });

  it("grava audit log com a action e metadados corretos no caminho feliz (caso novo)", async () => {
    const newResponse = buildAnamnesisResponse();
    const newRegistration = buildRegistration({ id: "reg-new" });
    const { useCase, auditService } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        create: jest.fn().mockResolvedValue(newRegistration),
      }),
      anamnesisResponseRepo: buildFakeAnamnesisResponseRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    await useCase.execute(buildInput());

    expect(auditService.log).toHaveBeenCalledWith({
      actorId: "user-1",
      orgId: "org-1",
      action: "customer_self_registration_invite_sent",
      entityType: "customer_self_registration",
      entityId: "reg-new",
      metadata: { email: "novo@example.com", serviceTypeId: "type-1" },
    });
  });
});
