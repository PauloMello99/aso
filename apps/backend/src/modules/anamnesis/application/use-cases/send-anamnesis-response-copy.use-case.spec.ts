import {
  SendAnamnesisResponseCopyUseCase,
  SendAnamnesisResponseCopyInput,
} from "./send-anamnesis-response-copy.use-case";
import { ANAMNESIS_DOCUMENTS_BUCKET } from "./submit-anamnesis-response.use-case";
import {
  IAnamnesisResponseRepository,
  AnamnesisResponseDetail,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseNotSubmittedException } from "../../domain/exceptions/anamnesis-response-not-submitted.exception";
import { AnamnesisDocumentUnavailableException } from "../../domain/exceptions/anamnesis-document-unavailable.exception";
import { AnamnesisResponseNoRecipientException } from "../../domain/exceptions/anamnesis-response-no-recipient.exception";
import { AnamnesisInviteEmailFailedException } from "../../domain/exceptions/anamnesis-invite-email-failed.exception";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import { ICustomerRepository } from "../../../customers/domain/customer.repository.interface";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";

const questions: AnamnesisQuestion[] = [
  { id: "q-1", type: "text", label: "Alergias?", required: true },
];

function buildDetail(
  overrides: Partial<AnamnesisResponseDetail> = {},
): AnamnesisResponseDetail {
  const entity = AnamnesisResponseEntity.create({
    id: "response-1",
    orgId: "org-1",
    formVersionId: "version-1",
    serviceTypeId: "type-1",
    customerId: "customer-1",
    questionsSnapshot: questions,
    token: "token-1",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    status: "submitted",
    answers: null,
    submittedAt: new Date("2026-07-01T00:00:00Z"),
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
  });

  return {
    ...entity,
    customerName: "Cliente Teste",
    serviceTypeName: "Tipo Teste",
    versionNumber: 1,
    signerFullName: "Cliente Teste",
    signerCpf: null,
    signatureStoragePath: "org-1/response-1/attempt-1-signature.png",
    pdfStoragePath: "org-1/response-1/attempt-1-signed-form.pdf",
    consentTextSnapshot: "texto",
    consentAcceptedAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  } as AnamnesisResponseDetail;
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
    findSubmittedForVersion: jest.fn(),
    findPendingFor: jest.fn(),
    listByOrg: jest.fn(),
    findDetailById: jest.fn().mockResolvedValue(buildDetail()),
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

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn(),
    createSignedUrl: jest
      .fn()
      .mockResolvedValue("https://storage.example.com/signed-url"),
    createSignedFileUrls: jest.fn(),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildFakeMail(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendSignedAnamnesisResponseCopy: jest.fn().mockResolvedValue(true),
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

function buildInput(
  overrides: Partial<SendAnamnesisResponseCopyInput> = {},
): SendAnamnesisResponseCopyInput {
  return {
    orgId: "org-1",
    authId: "auth-1",
    responseId: "response-1",
    ...overrides,
  };
}

interface Deps {
  responseRepo: jest.Mocked<IAnamnesisResponseRepository>;
  customerRepo: jest.Mocked<ICustomerRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  storage: jest.Mocked<IStorageProvider>;
  mail: jest.Mocked<MailService>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    responseRepo: buildFakeRepo(),
    customerRepo: buildFakeCustomerRepo(),
    memberRepo: buildFakeMemberRepo(),
    storage: buildFakeStorage(),
    mail: buildFakeMail(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SendAnamnesisResponseCopyUseCase(
    deps.responseRepo,
    deps.customerRepo,
    deps.memberRepo,
    deps.storage,
    deps.mail,
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SendAnamnesisResponseCopyUseCase", () => {
  it("sucesso: gera signed URL com bucket/TTL/filename corretos, envia e-mail, audita e retorna sentTo", async () => {
    const { useCase, storage, mail, auditService } = buildUseCase();

    const result = await useCase.execute(buildInput());

    expect(storage.createSignedUrl).toHaveBeenCalledWith(
      ANAMNESIS_DOCUMENTS_BUCKET,
      "org-1/response-1/attempt-1-signed-form.pdf",
      604_800,
      "ficha-anamnese.pdf",
    );
    expect(mail.sendSignedAnamnesisResponseCopy).toHaveBeenCalledWith({
      to: "cliente@example.com",
      customerName: "Cliente Teste",
      pdfUrl: "https://storage.example.com/signed-url",
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "anamnesis_copy_sent",
        entityType: "anamnesis_response",
        entityId: "response-1",
        metadata: { customerId: "customer-1" },
      }),
    );
    expect(result).toEqual({ sentTo: "cliente@example.com" });
  });

  it("lança AnamnesisResponseNotFoundException quando a resposta não existe", async () => {
    const { useCase, storage, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findDetailById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisResponseNotFoundException,
    );
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseNotSubmittedException quando status não é submitted", async () => {
    const { useCase, storage, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findDetailById: jest
          .fn()
          .mockResolvedValue(buildDetail({ status: "pending" })),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisResponseNotSubmittedException,
    );
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("lança AnamnesisDocumentUnavailableException quando pdfStoragePath é nulo, sem chamar storage", async () => {
    const { useCase, storage, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findDetailById: jest
          .fn()
          .mockResolvedValue(buildDetail({ pdfStoragePath: null })),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisDocumentUnavailableException,
    );
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("lança AnamnesisDocumentUnavailableException quando a geração da signed URL falha", async () => {
    const { useCase, mail } = buildUseCase({
      storage: buildFakeStorage({
        createSignedUrl: jest
          .fn()
          .mockRejectedValue(new Error("storage indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisDocumentUnavailableException,
    );
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseNoRecipientException quando customerId é nulo", async () => {
    const { useCase, storage, mail } = buildUseCase({
      responseRepo: buildFakeRepo({
        findDetailById: jest
          .fn()
          .mockResolvedValue(buildDetail({ customerId: null })),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisResponseNoRecipientException,
    );
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseNoRecipientException quando o cliente não tem e-mail", async () => {
    const { useCase, storage, mail } = buildUseCase({
      customerRepo: buildFakeCustomerRepo({
        findById: jest.fn().mockResolvedValue(buildCustomer({ email: "" })),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisResponseNoRecipientException,
    );
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("propaga AnamnesisInviteEmailFailedException quando o envio de e-mail falha", async () => {
    const { useCase, auditService } = buildUseCase({
      mail: buildFakeMail({
        sendSignedAnamnesisResponseCopy: jest
          .fn()
          .mockRejectedValue(new Error("resend indisponível")),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisInviteEmailFailedException,
    );
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
