import {
  SubmitCustomerUpdateUseCase,
  SubmitCustomerUpdateInput,
} from "./submit-customer-update.use-case";
import {
  ICustomerUpdateInvitationRepository,
  CustomerUpdateInvitationWithContext,
} from "../../domain/customer-update-invitation.repository.interface";
import { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";
import { CustomerUpdateInvitationNotFoundException } from "../../domain/exceptions/customer-update-invitation-not-found.exception";
import { CustomerUpdateInvitationAlreadySubmittedException } from "../../domain/exceptions/customer-update-invitation-already-submitted.exception";
import { CustomerUpdateInvitationExpiredException } from "../../domain/exceptions/customer-update-invitation-expired.exception";
import { IPublicCustomerWriter } from "../../domain/ports/public-customer-writer.port";
import { CustomerEmailAlreadyExistsException } from "../../../customers/domain/exceptions/customer-email-already-exists.exception";
import { CustomerEntity } from "../../../customers/domain/customer.entity";
import { AuditService } from "../../../audit/audit.service";

function buildInvitationWithContext(
  overrides: Partial<CustomerUpdateInvitationWithContext> = {},
): CustomerUpdateInvitationWithContext {
  const base = CustomerUpdateInvitationEntity.create({
    id: "invite-1",
    orgId: "org-1",
    customerId: "customer-1",
    token: "token-1",
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
      customerName: "Cliente Teste",
      customerEmail: "cliente@example.com",
      customerPhone: "11999999999",
      customerBirthDate: "1990-01-01",
      customerAddress: "Rua Teste",
      customerNumber: "100",
      customerAddressLine2: null,
      customerCity: "São Paulo",
      customerState: "SP",
      customerPostalCode: "01000-000",
      customerCountry: "BR",
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

function buildFakeUpdateInviteRepo(
  overrides: Partial<jest.Mocked<ICustomerUpdateInvitationRepository>> = {},
): jest.Mocked<ICustomerUpdateInvitationRepository> {
  return {
    create: jest.fn(),
    findPendingByCustomer: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerUpdateInvitationRepository>;
}

function buildFakePublicCustomerWriter(
  overrides: Partial<jest.Mocked<IPublicCustomerWriter>> = {},
): jest.Mocked<IPublicCustomerWriter> {
  return {
    findByEmailInOrg: jest.fn().mockResolvedValue(null),
    findByIdInOrg: jest.fn(),
    createForOrg: jest.fn(),
    updateCoreFields: jest.fn().mockResolvedValue(buildCustomer()),
    ...overrides,
  } as unknown as jest.Mocked<IPublicCustomerWriter>;
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
  overrides: Partial<SubmitCustomerUpdateInput> = {},
): SubmitCustomerUpdateInput {
  return {
    token: "token-1",
    name: "Cliente Teste",
    ...overrides,
  };
}

interface Deps {
  updateInviteRepo: jest.Mocked<ICustomerUpdateInvitationRepository>;
  publicCustomerWriter: jest.Mocked<IPublicCustomerWriter>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    updateInviteRepo: buildFakeUpdateInviteRepo(),
    publicCustomerWriter: buildFakePublicCustomerWriter(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new SubmitCustomerUpdateUseCase(
    deps.updateInviteRepo,
    deps.publicCustomerWriter,
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("SubmitCustomerUpdateUseCase", () => {
  it("lança CustomerUpdateInvitationNotFoundException quando o token não existe, sem escrever nada", async () => {
    const { useCase, publicCustomerWriter, updateInviteRepo } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationNotFoundException,
    );
    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
    expect(publicCustomerWriter.updateCoreFields).not.toHaveBeenCalled();
    expect(updateInviteRepo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança CustomerUpdateInvitationAlreadySubmittedException quando já submetido, sem escrever nada", async () => {
    const invitation = buildInvitationWithContext({ status: "submitted" });
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationAlreadySubmittedException,
    );
    expect(publicCustomerWriter.updateCoreFields).not.toHaveBeenCalled();
  });

  it("lança CustomerUpdateInvitationExpiredException quando expirado, sem escrever nada", async () => {
    const invitation = buildInvitationWithContext({
      status: "pending",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationExpiredException,
    );
    expect(publicCustomerWriter.updateCoreFields).not.toHaveBeenCalled();
  });

  it("e-mail alterado colidindo com outro customer da org: lança CustomerEmailAlreadyExistsException, updateCoreFields NÃO chamado", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
      publicCustomerWriter: buildFakePublicCustomerWriter({
        findByEmailInOrg: jest
          .fn()
          .mockResolvedValue({ id: "other-customer" }),
      }),
    });

    await expect(
      useCase.execute(buildInput({ email: "novo@example.com" })),
    ).rejects.toBeInstanceOf(CustomerEmailAlreadyExistsException);

    expect(publicCustomerWriter.findByEmailInOrg).toHaveBeenCalledWith(
      "org-1",
      "novo@example.com",
      "customer-1",
    );
    expect(publicCustomerWriter.updateCoreFields).not.toHaveBeenCalled();
  });

  it("e-mail alterado sem colisão: passa e atualiza normalmente", async () => {
    const invitation = buildInvitationWithContext();
    const updatedCustomer = buildCustomer({ email: "novo@example.com" });
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
      publicCustomerWriter: buildFakePublicCustomerWriter({
        findByEmailInOrg: jest.fn().mockResolvedValue(null),
        updateCoreFields: jest.fn().mockResolvedValue(updatedCustomer),
      }),
    });

    const result = await useCase.execute(
      buildInput({ email: "novo@example.com" }),
    );

    expect(publicCustomerWriter.updateCoreFields).toHaveBeenCalledWith(
      "customer-1",
      "org-1",
      expect.objectContaining({ email: "novo@example.com" }),
    );
    expect(result).toEqual({ customerId: "customer-1" });
  });

  // Decisão: quando o e-mail informado é igual (case/trim-insensitive) ao e-mail
  // atual do convite, `findByEmailInOrg` NÃO é chamado — é a abordagem mais simples
  // das duas sugeridas (evita a query desnecessária no caminho comum em que o
  // e-mail não muda, dispensando também lidar com "self-match").
  it("e-mail não alterado: não chama findByEmailInOrg (otimização)", async () => {
    const invitation = buildInvitationWithContext({
      customerEmail: "cliente@example.com",
    });
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    });

    await useCase.execute(
      buildInput({ email: "  Cliente@Example.com  " }),
    );

    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
  });

  it("e-mail não informado no input: não chama findByEmailInOrg", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase, publicCustomerWriter } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    });

    await useCase.execute(buildInput({ name: "Novo Nome" }));

    expect(publicCustomerWriter.findByEmailInOrg).not.toHaveBeenCalled();
  });

  it("caminho feliz: atualiza só os campos enviados e grava audit", async () => {
    const invitation = buildInvitationWithContext();
    const updatedCustomer = buildCustomer({ name: "Novo Nome" });
    const { useCase, publicCustomerWriter, auditService, updateInviteRepo } =
      buildUseCase({
        updateInviteRepo: buildFakeUpdateInviteRepo({
          findByToken: jest.fn().mockResolvedValue(invitation),
        }),
        publicCustomerWriter: buildFakePublicCustomerWriter({
          updateCoreFields: jest.fn().mockResolvedValue(updatedCustomer),
        }),
      });

    const result = await useCase.execute(buildInput({ name: "Novo Nome" }));

    expect(publicCustomerWriter.updateCoreFields).toHaveBeenCalledWith(
      "customer-1",
      "org-1",
      { name: "Novo Nome" },
    );
    expect(updateInviteRepo.markSubmitted).toHaveBeenCalledWith("invite-1");
    expect(auditService.log).toHaveBeenCalledWith({
      actorId: null,
      orgId: "org-1",
      action: "customer_self_updated",
      entityType: "customer",
      entityId: "customer-1",
      metadata: { invitationId: "invite-1", changedFields: ["name"] },
    });
    expect(result).toEqual({ customerId: "customer-1" });
  });

  it("changedFields do audit lista só os campos com valor definido, ignorando os undefined que o controller sempre envia", async () => {
    const invitation = buildInvitationWithContext();
    const updatedCustomer = buildCustomer({ name: "Novo Nome", phone: "11888888888" });
    const { useCase, auditService } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
      publicCustomerWriter: buildFakePublicCustomerWriter({
        updateCoreFields: jest.fn().mockResolvedValue(updatedCustomer),
      }),
    });

    // Simula o objeto montado pelo controller: todas as chaves presentes, valor
    // `undefined` para as não enviadas pelo cliente.
    await useCase.execute(
      buildInput({
        name: "Novo Nome",
        phone: "11888888888",
        birthDate: undefined,
        gender: undefined,
        address: undefined,
        number: undefined,
        addressLine2: undefined,
        city: undefined,
        state: undefined,
        postalCode: undefined,
        country: undefined,
      }),
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          invitationId: "invite-1",
          changedFields: ["name", "phone"],
        },
      }),
    );
  });

  it("updateCoreFields retornando null: lança erro interno, não marca submitted, não grava audit", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase, updateInviteRepo, auditService } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
      publicCustomerWriter: buildFakePublicCustomerWriter({
        updateCoreFields: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toThrow();
    expect(updateInviteRepo.markSubmitted).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it("markSubmitted retornando false não lança erro; resultado de sucesso ainda é retornado", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase, auditService } = buildUseCase({
      updateInviteRepo: buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
        markSubmitted: jest.fn().mockResolvedValue(false),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(result).toEqual({ customerId: "customer-1" });
    expect(auditService.log).toHaveBeenCalled();
  });
});
