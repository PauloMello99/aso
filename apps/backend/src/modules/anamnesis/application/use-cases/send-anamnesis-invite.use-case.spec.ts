import {
  SendAnamnesisInviteUseCase,
  SendAnamnesisInviteInput,
} from "./send-anamnesis-invite.use-case";
import { GetCurrentAnamnesisFormVersionUseCase } from "./get-current-anamnesis-form-version.use-case";
import { IAnamnesisResponseRepository } from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import { AnamnesisFormVersionEntity } from "../../domain/anamnesis-form-version.entity";
import { AnamnesisFormNotConfiguredException } from "../../domain/exceptions/anamnesis-form-not-configured.exception";
import { AnamnesisInviteEmailFailedException } from "../../domain/exceptions/anamnesis-invite-email-failed.exception";
import { AnamnesisAlreadyAnsweredCurrentVersionException } from "../../domain/exceptions/anamnesis-already-answered-current-version.exception";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { CustomerNotFoundException } from "../../../customers/domain/exceptions/customer-not-found.exception";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";
import type { ConfigService } from "@nestjs/config";

const questions: AnamnesisQuestion[] = [
  { id: "q-1", type: "text", label: "Alergias?", required: true },
];

function buildResponse(
  overrides: Partial<Parameters<typeof AnamnesisResponseEntity.create>[0]> = {},
): AnamnesisResponseEntity {
  return AnamnesisResponseEntity.create({
    id: "response-1",
    orgId: "org-1",
    formVersionId: "version-1",
    serviceTypeId: "type-1",
    customerId: "customer-1",
    questionsSnapshot: questions,
    token: "token-1",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    status: "pending",
    answers: null,
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  });
}

function buildVersion(
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

function buildFakeRepo(
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
    findSubmittedForVersion: jest.fn().mockResolvedValue(null),
    findPendingFor: jest.fn().mockResolvedValue(null),
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

function buildFakeMail(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendAnamnesisLink: jest.fn().mockResolvedValue(true),
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

function buildFakeGetCurrentVersion(
  version: AnamnesisFormVersionEntity | null = buildVersion(),
): jest.Mocked<GetCurrentAnamnesisFormVersionUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(version),
  } as unknown as jest.Mocked<GetCurrentAnamnesisFormVersionUseCase>;
}

function buildInput(
  overrides: Partial<SendAnamnesisInviteInput> = {},
): SendAnamnesisInviteInput {
  return {
    orgId: "org-1",
    authId: "auth-1",
    customerId: "customer-1",
    serviceTypeId: "type-1",
    ...overrides,
  };
}

interface Deps {
  responseRepo: jest.Mocked<IAnamnesisResponseRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  getCurrentVersion: jest.Mocked<GetCurrentAnamnesisFormVersionUseCase>;
  mail: jest.Mocked<MailService>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    responseRepo: buildFakeRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    getCurrentVersion: buildFakeGetCurrentVersion(),
    mail: buildFakeMail(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SendAnamnesisInviteUseCase(
    deps.responseRepo,
    deps.customerRepo,
    deps.memberRepo,
    deps.getCurrentVersion,
    deps.mail,
    buildFakeConfig(),
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SendAnamnesisInviteUseCase", () => {
  it("lança AnamnesisFormNotConfiguredException quando não há versão vigente do formulário", async () => {
    const { useCase, responseRepo } = buildUseCase({
      getCurrentVersion: buildFakeGetCurrentVersion(null),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisFormNotConfiguredException,
    );
    expect(responseRepo.create).not.toHaveBeenCalled();
  });

  it("(a) lança AnamnesisAlreadyAnsweredCurrentVersionException quando já respondeu a versão vigente, sem escritas nem e-mail", async () => {
    const answered = buildResponse({
      id: "response-answered",
      status: "submitted",
      submittedAt: new Date("2026-05-01T00:00:00Z"),
    });
    const { useCase, responseRepo, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findSubmittedForVersion: jest.fn().mockResolvedValue(answered),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisAlreadyAnsweredCurrentVersionException,
    );
    expect(responseRepo.create).not.toHaveBeenCalled();
    expect(responseRepo.deletePendingFor).not.toHaveBeenCalled();
    expect(responseRepo.findPendingFor).not.toHaveBeenCalled();
    expect(mail.sendAnamnesisLink).not.toHaveBeenCalled();
  });

  it("(b) cria e envia normalmente quando só existe submitted de versão ANTIGA (não a vigente)", async () => {
    // O gate é escopado pelo id da versão VIGENTE (version.id); uma resposta
    // submitted de versão antiga nunca é retornada pela query, então
    // findSubmittedForVersion resolve null e o fluxo segue normalmente.
    const newResponse = buildResponse({ id: "response-new" });
    const { useCase, responseRepo, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findSubmittedForVersion: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(responseRepo.findSubmittedForVersion).toHaveBeenCalledWith(
      "customer-1",
      "version-1",
      "org-1",
    );
    expect(responseRepo.create).toHaveBeenCalledTimes(1);
    expect(mail.sendAnamnesisLink).toHaveBeenCalledTimes(1);
    expect(result.resent).toBe(false);
  });

  it("(c) reutiliza convite pendente vigente e não expirado: não cria nem deleta, envia com o token existente, resent=true", async () => {
    const pending = buildResponse({ id: "response-pending", token: "token-pending" });
    const { useCase, responseRepo, mail, auditService } = buildUseCase({
      responseRepo: buildFakeRepo({
        findPendingFor: jest.fn().mockResolvedValue(pending),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(responseRepo.create).not.toHaveBeenCalled();
    expect(responseRepo.deletePendingFor).not.toHaveBeenCalled();
    expect(mail.sendAnamnesisLink).toHaveBeenCalledWith(
      expect.objectContaining({
        fillUrl: expect.stringContaining("/anamnesis/token-pending"),
      }),
    );
    expect(result.resent).toBe(true);
    expect(result.response).toBe(pending);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "anamnesis_invite_resent" }),
    );
  });

  it("(d) pendente existente de versão ANTIGA: deleta e cria novo, resent=false", async () => {
    const pending = buildResponse({
      id: "response-pending",
      formVersionId: "version-old",
    });
    const newResponse = buildResponse({ id: "response-new" });
    const { useCase, responseRepo } = buildUseCase({
      responseRepo: buildFakeRepo({
        findPendingFor: jest.fn().mockResolvedValue(pending),
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(responseRepo.deletePendingFor).toHaveBeenCalledWith(
      "customer-1",
      "type-1",
      "org-1",
    );
    expect(responseRepo.create).toHaveBeenCalledTimes(1);
    expect(result.resent).toBe(false);
  });

  it("(e) pendente existente EXPIRADO: deleta e cria novo, resent=false", async () => {
    const pending = buildResponse({
      id: "response-pending",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const newResponse = buildResponse({ id: "response-new" });
    const { useCase, responseRepo } = buildUseCase({
      responseRepo: buildFakeRepo({
        findPendingFor: jest.fn().mockResolvedValue(pending),
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(responseRepo.deletePendingFor).toHaveBeenCalledWith(
      "customer-1",
      "type-1",
      "org-1",
    );
    expect(responseRepo.create).toHaveBeenCalledTimes(1);
    expect(result.resent).toBe(false);
  });

  it("(f) nada existente (nem submitted nem pending): cria e envia, resent=false", async () => {
    const newResponse = buildResponse({ id: "response-new" });
    const { useCase, responseRepo, auditService } = buildUseCase({
      responseRepo: buildFakeRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(responseRepo.create).toHaveBeenCalledTimes(1);
    expect(result.resent).toBe(false);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "anamnesis_invite_sent" }),
    );
  });

  it("(g) falha de e-mail no caminho de REUSO: não deleta o pendente preexistente e lança AnamnesisInviteEmailFailedException", async () => {
    const pending = buildResponse({ id: "response-pending" });
    const { useCase, responseRepo } = buildUseCase({
      responseRepo: buildFakeRepo({
        findPendingFor: jest.fn().mockResolvedValue(pending),
      }),
      mail: buildFakeMail({
        sendAnamnesisLink: jest.fn().mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisInviteEmailFailedException,
    );
    expect(responseRepo.delete).not.toHaveBeenCalled();
    expect(responseRepo.deletePendingFor).not.toHaveBeenCalled();
  });

  it("(h) falha de e-mail no caminho de CRIAÇÃO: compensa deletando a resposta recém-criada", async () => {
    const newResponse = buildResponse({ id: "response-new" });
    const { useCase, responseRepo } = buildUseCase({
      responseRepo: buildFakeRepo({
        create: jest.fn().mockResolvedValue(newResponse),
      }),
      mail: buildFakeMail({
        sendAnamnesisLink: jest.fn().mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisInviteEmailFailedException,
    );
    expect(responseRepo.delete).toHaveBeenCalledWith("response-new");
  });

  it("lança CustomerNotFoundException quando o cliente não é encontrado, sem escritas", async () => {
    const { useCase, responseRepo, mail } = buildUseCase({
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerNotFoundException,
    );
    expect(responseRepo.create).not.toHaveBeenCalled();
    expect(mail.sendAnamnesisLink).not.toHaveBeenCalled();
  });
});
