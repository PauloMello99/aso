import {
  SubmitCustomerSelfRegistrationUseCase,
  SubmitCustomerSelfRegistrationInput,
} from "./submit-customer-self-registration.use-case";
import {
  ICustomerSelfRegistrationRepository,
  CustomerSelfRegistrationWithContext,
} from "../../domain/customer-self-registration.repository.interface";
import { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import { CustomerSelfRegistrationNotFoundException } from "../../domain/exceptions/customer-self-registration-not-found.exception";
import { CustomerSelfRegistrationAlreadySubmittedException } from "../../domain/exceptions/customer-self-registration-already-submitted.exception";
import { CustomerSelfRegistrationExpiredException } from "../../domain/exceptions/customer-self-registration-expired.exception";
import { IPublicCustomerWriter } from "../../domain/ports/public-customer-writer.port";
import { IAnamnesisResponseRepository } from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import { SubmitAnamnesisResponseUseCase } from "../../../anamnesis/application/use-cases/submit-anamnesis-response.use-case";
import { AnamnesisConsentRequiredException } from "../../../anamnesis/domain/exceptions/anamnesis-consent-required.exception";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { AuditService } from "../../../audit/audit.service";

function buildRegistrationWithContext(
  overrides: Partial<CustomerSelfRegistrationWithContext> = {},
): CustomerSelfRegistrationWithContext {
  const base = CustomerSelfRegistrationEntity.create({
    id: "reg-1",
    orgId: "org-1",
    serviceTypeId: "type-1",
    email: "cliente@example.com",
    token: "token-1",
    anamnesisResponseId: "response-1",
    customerId: null,
    status: "pending",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
  });
  return Object.assign(
    base,
    {
      organizationName: "Estúdio Teste",
      serviceTypeName: "Tatuagem",
      anamnesisToken: "anamnesis-token-1",
    },
    overrides,
  );
}

function buildCustomer(
  overrides: Partial<Parameters<typeof CustomerEntity.create>[0]> = {},
): CustomerEntity {
  return CustomerEntity.create({
    id: "customer-1",
    orgId: "org-1",
    userId: null,
    originId: null,
    createdBy: null,
    name: "Cliente Teste",
    email: "cliente@example.com",
    phone: "11999999999",
    birthDate: "1990-01-01",
    gender: null,
    address: "Rua Teste",
    number: "100",
    addressLine2: null,
    city: "São Paulo",
    state: "SP",
    postalCode: "01000-000",
    country: "BR",
    notes: null,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeSelfRegRepo(
  overrides: Partial<jest.Mocked<ICustomerSelfRegistrationRepository>> = {},
): jest.Mocked<ICustomerSelfRegistrationRepository> {
  return {
    create: jest.fn(),
    findPendingByEmail: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    linkCustomer: jest.fn().mockResolvedValue(undefined),
    markSubmitted: jest.fn().mockResolvedValue(true),
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
    linkCustomer: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisResponseRepository>;
}

function buildFakePublicCustomerWriter(
  overrides: Partial<jest.Mocked<IPublicCustomerWriter>> = {},
): jest.Mocked<IPublicCustomerWriter> {
  return {
    findByEmailInOrg: jest.fn().mockResolvedValue(null),
    findByIdInOrg: jest.fn(),
    createForOrg: jest.fn(),
    updateCoreFields: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPublicCustomerWriter>;
}

function buildFakeSubmitAnamnesis(
  overrides: Partial<jest.Mocked<SubmitAnamnesisResponseUseCase>> = {},
): jest.Mocked<SubmitAnamnesisResponseUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<SubmitAnamnesisResponseUseCase>;
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
  overrides: Partial<SubmitCustomerSelfRegistrationInput> = {},
): SubmitCustomerSelfRegistrationInput {
  return {
    token: "token-1",
    name: "Cliente Teste",
    birthDate: "1990-01-01",
    phone: "11999999999",
    gender: null,
    address: "Rua Teste",
    number: "100",
    addressLine2: null,
    city: "São Paulo",
    state: "SP",
    postalCode: "01000-000",
    country: "BR",
    answers: [{ questionId: "q-1", value: "Nenhuma" }],
    signerFullName: "Cliente Teste",
    signerCpf: "12345678900",
    signatureImageBase64: "data:image/png;base64,AAAA",
    consentAccepted: true,
    consentVersion: "v1",
    requestIp: "127.0.0.1",
    requestUserAgent: "jest",
    ...overrides,
  };
}

interface Deps {
  selfRegRepo: jest.Mocked<ICustomerSelfRegistrationRepository>;
  publicCustomerWriter: jest.Mocked<IPublicCustomerWriter>;
  anamnesisResponseRepo: jest.Mocked<IAnamnesisResponseRepository>;
  submitAnamnesis: jest.Mocked<SubmitAnamnesisResponseUseCase>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    selfRegRepo: buildFakeSelfRegRepo(),
    publicCustomerWriter: buildFakePublicCustomerWriter(),
    anamnesisResponseRepo: buildFakeAnamnesisResponseRepo(),
    submitAnamnesis: buildFakeSubmitAnamnesis(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SubmitCustomerSelfRegistrationUseCase(
    deps.selfRegRepo,
    deps.publicCustomerWriter,
    deps.anamnesisResponseRepo,
    deps.submitAnamnesis,
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SubmitCustomerSelfRegistrationUseCase", () => {
  it("lança CustomerSelfRegistrationNotFoundException quando o token não existe, sem escrever nada", async () => {
    const { useCase, publicCustomerWriter, selfRegRepo, submitAnamnesis } =
      buildUseCase({
        selfRegRepo: buildFakeSelfRegRepo({
          findByToken: jest.fn().mockResolvedValue(null),
        }),
      });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationNotFoundException,
    );
    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
    expect(selfRegRepo.linkCustomer).not.toHaveBeenCalled();
    expect(submitAnamnesis.execute).not.toHaveBeenCalled();
  });

  it("lança CustomerSelfRegistrationAlreadySubmittedException quando já submetido, sem escrever nada", async () => {
    const registration = buildRegistrationWithContext({ status: "submitted" });
    const { useCase, publicCustomerWriter } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationAlreadySubmittedException,
    );
    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
  });

  it("lança CustomerSelfRegistrationExpiredException quando expirado, sem escrever nada", async () => {
    const registration = buildRegistrationWithContext({
      status: "pending",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const { useCase, publicCustomerWriter } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationExpiredException,
    );
    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
  });

  it("caminho feliz (customer novo): cria, linka registration e anamnesis ANTES do submit, e marca submitted", async () => {
    const registration = buildRegistrationWithContext();
    const newCustomer = buildCustomer({ id: "customer-new" });
    const callOrder: string[] = [];

    const selfRegRepo = buildFakeSelfRegRepo({
      findByToken: jest.fn().mockResolvedValue(registration),
      linkCustomer: jest.fn().mockImplementation(async () => {
        callOrder.push("selfReg.linkCustomer");
      }),
      markSubmitted: jest.fn().mockImplementation(async () => {
        callOrder.push("markSubmitted");
        return true;
      }),
    });
    const anamnesisResponseRepo = buildFakeAnamnesisResponseRepo({
      linkCustomer: jest.fn().mockImplementation(async () => {
        callOrder.push("anamnesis.linkCustomer");
      }),
    });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue(null),
      createForOrg: jest.fn().mockImplementation(async () => {
        callOrder.push("createForOrg");
        return newCustomer;
      }),
    });
    const submitAnamnesis = buildFakeSubmitAnamnesis({
      execute: jest.fn().mockImplementation(async () => {
        callOrder.push("submitAnamnesis.execute");
      }),
    });

    const { useCase, auditService } = buildUseCase({
      selfRegRepo,
      anamnesisResponseRepo,
      publicCustomerWriter,
      submitAnamnesis,
    });

    const result = await useCase.execute(buildInput());

    expect(publicCustomerWriter.createForOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        email: "cliente@example.com",
        name: "Cliente Teste",
      }),
    );
    expect(publicCustomerWriter.updateCoreFields).not.toHaveBeenCalled();
    expect(selfRegRepo.linkCustomer).toHaveBeenCalledWith(
      "reg-1",
      "customer-new",
    );
    expect(anamnesisResponseRepo.linkCustomer).toHaveBeenCalledWith(
      "response-1",
      "customer-new",
      "org-1",
    );
    expect(submitAnamnesis.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "anamnesis-token-1",
        answers: [{ questionId: "q-1", value: "Nenhuma" }],
        signerFullName: "Cliente Teste",
      }),
    );
    expect(selfRegRepo.markSubmitted).toHaveBeenCalledWith(
      "reg-1",
      "customer-new",
    );
    expect(callOrder).toEqual([
      "createForOrg",
      "selfReg.linkCustomer",
      "anamnesis.linkCustomer",
      "submitAnamnesis.execute",
      "markSubmitted",
    ]);
    expect(result).toEqual({ customerId: "customer-new" });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        orgId: "org-1",
        action: "customer_self_registered",
        entityType: "customer",
        entityId: "customer-new",
        metadata: { registrationId: "reg-1", serviceTypeId: "type-1" },
      }),
    );
  });

  it("retentativa: findByEmailInOrg retorna customer existente → usa updateCoreFields, não chama createForOrg", async () => {
    const registration = buildRegistrationWithContext();
    const existingCustomer = buildCustomer({ id: "customer-existing" });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue({ id: "customer-existing" }),
      updateCoreFields: jest.fn().mockResolvedValue(existingCustomer),
    });
    const { useCase, selfRegRepo, anamnesisResponseRepo, submitAnamnesis } =
      buildUseCase({
        selfRegRepo: buildFakeSelfRegRepo({
          findByToken: jest.fn().mockResolvedValue(registration),
        }),
        publicCustomerWriter,
      });

    const result = await useCase.execute(buildInput());

    expect(publicCustomerWriter.updateCoreFields).toHaveBeenCalledWith(
      "customer-existing",
      "org-1",
      expect.objectContaining({ name: "Cliente Teste" }),
    );
    expect(publicCustomerWriter.createForOrg).not.toHaveBeenCalled();
    expect(selfRegRepo.linkCustomer).toHaveBeenCalledWith(
      "reg-1",
      "customer-existing",
    );
    expect(anamnesisResponseRepo.linkCustomer).toHaveBeenCalledWith(
      "response-1",
      "customer-existing",
      "org-1",
    );
    expect(submitAnamnesis.execute).toHaveBeenCalled();
    expect(result).toEqual({ customerId: "customer-existing" });
  });

  it("retentativa com e-mail alterado entre tentativas: prioriza registration.customerId sobre findByEmailInOrg, evitando duplicidade", async () => {
    const registration = buildRegistrationWithContext({
      customerId: "customer-marked",
    });
    const updatedCustomer = buildCustomer({ id: "customer-marked" });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      // E-mail mudou entre tentativas (ex.: via cenário 3) — lookup por e-mail não
      // acharia mais o customer certo. Retorna null para provar que o use-case nem
      // depende desse resultado quando customerId já está marcado.
      findByEmailInOrg: jest.fn().mockResolvedValue(null),
      updateCoreFields: jest.fn().mockResolvedValue(updatedCustomer),
    });
    const { useCase, selfRegRepo, anamnesisResponseRepo } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
      publicCustomerWriter,
    });

    const result = await useCase.execute(buildInput());

    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
    expect(publicCustomerWriter.updateCoreFields).toHaveBeenCalledWith(
      "customer-marked",
      "org-1",
      expect.objectContaining({ name: "Cliente Teste" }),
    );
    expect(publicCustomerWriter.createForOrg).not.toHaveBeenCalled();
    expect(selfRegRepo.linkCustomer).toHaveBeenCalledWith(
      "reg-1",
      "customer-marked",
    );
    expect(anamnesisResponseRepo.linkCustomer).toHaveBeenCalledWith(
      "response-1",
      "customer-marked",
      "org-1",
    );
    expect(result).toEqual({ customerId: "customer-marked" });
  });

  it("propaga exceção de validação do submit de anamnese sem capturar (retryável), após já ter feito o trabalho idempotente", async () => {
    const registration = buildRegistrationWithContext();
    const newCustomer = buildCustomer({ id: "customer-new" });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue(null),
      createForOrg: jest.fn().mockResolvedValue(newCustomer),
    });
    const submitAnamnesis = buildFakeSubmitAnamnesis({
      execute: jest.fn().mockRejectedValue(new AnamnesisConsentRequiredException()),
    });
    const { useCase, selfRegRepo, anamnesisResponseRepo, auditService } =
      buildUseCase({
        selfRegRepo: buildFakeSelfRegRepo({
          findByToken: jest.fn().mockResolvedValue(registration),
        }),
        publicCustomerWriter,
        submitAnamnesis,
      });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisConsentRequiredException,
    );

    expect(publicCustomerWriter.createForOrg).toHaveBeenCalled();
    expect(selfRegRepo.linkCustomer).toHaveBeenCalledWith(
      "reg-1",
      "customer-new",
    );
    expect(anamnesisResponseRepo.linkCustomer).toHaveBeenCalledWith(
      "response-1",
      "customer-new",
      "org-1",
    );
    expect(selfRegRepo.markSubmitted).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("markSubmitted retornando false não lança erro; resultado de sucesso ainda é retornado", async () => {
    const registration = buildRegistrationWithContext();
    const newCustomer = buildCustomer({ id: "customer-new" });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue(null),
      createForOrg: jest.fn().mockResolvedValue(newCustomer),
    });
    const { useCase, auditService } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
        markSubmitted: jest.fn().mockResolvedValue(false),
      }),
      publicCustomerWriter,
    });

    const result = await useCase.execute(buildInput());

    expect(result).toEqual({ customerId: "customer-new" });
    expect(auditService.log).toHaveBeenCalled();
  });

  it("lança erro interno quando updateCoreFields retorna null (linha não encontrada na org) e não prossegue", async () => {
    const registration = buildRegistrationWithContext();
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue({ id: "customer-existing" }),
      updateCoreFields: jest.fn().mockResolvedValue(null),
    });
    const { useCase, selfRegRepo, submitAnamnesis } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
      publicCustomerWriter,
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow();
    expect(selfRegRepo.linkCustomer).not.toHaveBeenCalled();
    expect(submitAnamnesis.execute).not.toHaveBeenCalled();
  });

  it("sem anamnesisResponseId/anamnesisToken: não linka nem submete anamnese, mas ainda marca submitted", async () => {
    const registration = buildRegistrationWithContext({
      anamnesisResponseId: null,
      anamnesisToken: null,
    });
    const newCustomer = buildCustomer({ id: "customer-new" });
    const publicCustomerWriter = buildFakePublicCustomerWriter({
      findByEmailInOrg: jest.fn().mockResolvedValue(null),
      createForOrg: jest.fn().mockResolvedValue(newCustomer),
    });
    const { useCase, anamnesisResponseRepo, submitAnamnesis, selfRegRepo } =
      buildUseCase({
        selfRegRepo: buildFakeSelfRegRepo({
          findByToken: jest.fn().mockResolvedValue(registration),
        }),
        publicCustomerWriter,
      });

    const result = await useCase.execute(buildInput());

    expect(anamnesisResponseRepo.linkCustomer).not.toHaveBeenCalled();
    expect(submitAnamnesis.execute).not.toHaveBeenCalled();
    expect(selfRegRepo.markSubmitted).toHaveBeenCalledWith(
      "reg-1",
      "customer-new",
    );
    expect(result).toEqual({ customerId: "customer-new" });
  });
});
