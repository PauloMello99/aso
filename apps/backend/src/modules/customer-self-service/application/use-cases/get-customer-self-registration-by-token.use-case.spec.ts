import {
  GetCustomerSelfRegistrationByTokenUseCase,
  GetCustomerSelfRegistrationByTokenInput,
} from "./get-customer-self-registration-by-token.use-case";
import {
  ICustomerSelfRegistrationRepository,
  CustomerSelfRegistrationWithContext,
} from "../../domain/customer-self-registration.repository.interface";
import { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import { CustomerSelfRegistrationNotFoundException } from "../../domain/exceptions/customer-self-registration-not-found.exception";
import { CustomerSelfRegistrationAlreadySubmittedException } from "../../domain/exceptions/customer-self-registration-already-submitted.exception";
import { CustomerSelfRegistrationExpiredException } from "../../domain/exceptions/customer-self-registration-expired.exception";
import {
  GetAnamnesisResponseByTokenUseCase,
  GetAnamnesisResponseByTokenResult,
} from "../../../anamnesis/application/use-cases/get-anamnesis-response-by-token.use-case";

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

function buildAnamnesisFormResult(
  overrides: Partial<GetAnamnesisResponseByTokenResult> = {},
): GetAnamnesisResponseByTokenResult {
  return {
    questions: [{ id: "q-1", type: "text", label: "Alergias?", required: true }],
    customerName: "Cliente",
    organizationName: "Estúdio Teste",
    status: "pending",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    consent: { version: "v1", text: "Termo de consentimento" },
    ...overrides,
  };
}

function buildFakeSelfRegRepo(
  overrides: Partial<jest.Mocked<ICustomerSelfRegistrationRepository>> = {},
): jest.Mocked<ICustomerSelfRegistrationRepository> {
  return {
    create: jest.fn(),
    findPendingByEmail: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    linkCustomer: jest.fn(),
    markSubmitted: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerSelfRegistrationRepository>;
}

function buildFakeGetAnamnesisResponseByToken(
  overrides: Partial<jest.Mocked<GetAnamnesisResponseByTokenUseCase>> = {},
): jest.Mocked<GetAnamnesisResponseByTokenUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(buildAnamnesisFormResult()),
    ...overrides,
  } as unknown as jest.Mocked<GetAnamnesisResponseByTokenUseCase>;
}

function buildInput(
  overrides: Partial<GetCustomerSelfRegistrationByTokenInput> = {},
): GetCustomerSelfRegistrationByTokenInput {
  return {
    token: "token-1",
    ...overrides,
  };
}

interface Deps {
  selfRegRepo: jest.Mocked<ICustomerSelfRegistrationRepository>;
  getAnamnesisResponseByToken: jest.Mocked<GetAnamnesisResponseByTokenUseCase>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    selfRegRepo: buildFakeSelfRegRepo(),
    getAnamnesisResponseByToken: buildFakeGetAnamnesisResponseByToken(),
    ...overrides,
  };

  const useCase = new GetCustomerSelfRegistrationByTokenUseCase(
    deps.selfRegRepo,
    deps.getAnamnesisResponseByToken,
  );

  return { useCase, ...deps };
}

describe("GetCustomerSelfRegistrationByTokenUseCase", () => {
  it("lança CustomerSelfRegistrationNotFoundException quando o token não existe", async () => {
    const { useCase, getAnamnesisResponseByToken } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationNotFoundException,
    );
    expect(getAnamnesisResponseByToken.execute).not.toHaveBeenCalled();
  });

  it("lança CustomerSelfRegistrationAlreadySubmittedException quando já submetido", async () => {
    const registration = buildRegistrationWithContext({ status: "submitted" });
    const { useCase } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationAlreadySubmittedException,
    );
  });

  it("lança CustomerSelfRegistrationExpiredException quando o convite expirou", async () => {
    const registration = buildRegistrationWithContext({
      status: "pending",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const { useCase } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerSelfRegistrationExpiredException,
    );
  });

  it("retorna DTO combinado com anamnesisForm quando há anamnesisToken", async () => {
    const registration = buildRegistrationWithContext();
    const anamnesisForm = buildAnamnesisFormResult();
    const { useCase, getAnamnesisResponseByToken } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
      getAnamnesisResponseByToken: buildFakeGetAnamnesisResponseByToken({
        execute: jest.fn().mockResolvedValue(anamnesisForm),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(getAnamnesisResponseByToken.execute).toHaveBeenCalledWith(
      "anamnesis-token-1",
    );
    expect(result).toEqual({
      organizationName: "Estúdio Teste",
      email: "cliente@example.com",
      serviceTypeName: "Tatuagem",
      status: "pending",
      expiresAt: registration.expiresAt,
      anamnesisForm,
    });
  });

  it("retorna anamnesisForm null quando não há anamnesisToken, sem chamar o get-by-token", async () => {
    const registration = buildRegistrationWithContext({ anamnesisToken: null });
    const { useCase, getAnamnesisResponseByToken } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(getAnamnesisResponseByToken.execute).not.toHaveBeenCalled();
    expect(result.anamnesisForm).toBeNull();
  });

  it("não vaza PII: nenhum campo orgId/id interno/createdBy no resultado", async () => {
    const registration = buildRegistrationWithContext();
    const { useCase } = buildUseCase({
      selfRegRepo: buildFakeSelfRegRepo({
        findByToken: jest.fn().mockResolvedValue(registration),
      }),
    });

    const result = await useCase.execute(buildInput());

    expect(Object.keys(result).sort()).toEqual(
      [
        "organizationName",
        "email",
        "serviceTypeName",
        "status",
        "expiresAt",
        "anamnesisForm",
      ].sort(),
    );
  });
});
