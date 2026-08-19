import {
  GetCustomerUpdateInvitationByTokenUseCase,
  GetCustomerUpdateInvitationByTokenInput,
} from "./get-customer-update-invitation-by-token.use-case";
import {
  ICustomerUpdateInvitationRepository,
  CustomerUpdateInvitationWithContext,
} from "../../domain/customer-update-invitation.repository.interface";
import { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";
import { CustomerUpdateInvitationNotFoundException } from "../../domain/exceptions/customer-update-invitation-not-found.exception";
import { CustomerUpdateInvitationAlreadySubmittedException } from "../../domain/exceptions/customer-update-invitation-already-submitted.exception";
import { CustomerUpdateInvitationExpiredException } from "../../domain/exceptions/customer-update-invitation-expired.exception";

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

function buildFakeUpdateInviteRepo(
  overrides: Partial<jest.Mocked<ICustomerUpdateInvitationRepository>> = {},
): jest.Mocked<ICustomerUpdateInvitationRepository> {
  return {
    create: jest.fn(),
    findPendingByCustomer: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ICustomerUpdateInvitationRepository>;
}

function buildInput(
  overrides: Partial<GetCustomerUpdateInvitationByTokenInput> = {},
): GetCustomerUpdateInvitationByTokenInput {
  return {
    token: "token-1",
    ...overrides,
  };
}

function buildUseCase(
  updateInviteRepo: jest.Mocked<ICustomerUpdateInvitationRepository> = buildFakeUpdateInviteRepo(),
) {
  const useCase = new GetCustomerUpdateInvitationByTokenUseCase(
    updateInviteRepo,
  );
  return { useCase, updateInviteRepo };
}

describe("GetCustomerUpdateInvitationByTokenUseCase", () => {
  it("lança CustomerUpdateInvitationNotFoundException quando o token não existe", async () => {
    const { useCase } = buildUseCase(
      buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(null),
      }),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationNotFoundException,
    );
  });

  it("lança CustomerUpdateInvitationAlreadySubmittedException quando já submetido", async () => {
    const invitation = buildInvitationWithContext({ status: "submitted" });
    const { useCase } = buildUseCase(
      buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationAlreadySubmittedException,
    );
  });

  it("lança CustomerUpdateInvitationExpiredException quando o convite expirou", async () => {
    const invitation = buildInvitationWithContext({
      status: "pending",
      expiresAt: new Date("2000-01-01T00:00:00Z"),
    });
    const { useCase } = buildUseCase(
      buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      CustomerUpdateInvitationExpiredException,
    );
  });

  it("retorna o snapshot pré-preenchido no caminho feliz", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase } = buildUseCase(
      buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    );

    const result = await useCase.execute(buildInput());

    expect(result).toEqual({
      organizationName: "Estúdio Teste",
      status: "pending",
      expiresAt: invitation.expiresAt,
      customer: {
        name: "Cliente Teste",
        email: "cliente@example.com",
        phone: "11999999999",
        birthDate: "1990-01-01",
        address: "Rua Teste",
        number: "100",
        addressLine2: null,
        city: "São Paulo",
        state: "SP",
        postalCode: "01000-000",
        country: "BR",
      },
    });
  });

  it("não vaza PII: nenhum campo orgId/id interno/createdBy/customerId no resultado", async () => {
    const invitation = buildInvitationWithContext();
    const { useCase } = buildUseCase(
      buildFakeUpdateInviteRepo({
        findByToken: jest.fn().mockResolvedValue(invitation),
      }),
    );

    const result = await useCase.execute(buildInput());

    expect(Object.keys(result).sort()).toEqual(
      ["organizationName", "status", "expiresAt", "customer"].sort(),
    );
    expect(Object.keys(result.customer).sort()).toEqual(
      [
        "name",
        "email",
        "phone",
        "birthDate",
        "address",
        "number",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
      ].sort(),
    );
  });
});
