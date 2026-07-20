import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateCustomerDto } from "./create-customer.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Cliente Teste",
    email: "cliente@example.com",
    birthDate: "1990-01-01",
    address: "Rua Teste",
    number: "100",
    city: "São Paulo",
    state: "SP",
    ...overrides,
  };
}

function buildDto(overrides: Record<string, unknown> = {}): CreateCustomerDto {
  return plainToInstance(CreateCustomerDto, buildPayload(overrides));
}

describe("CreateCustomerDto obrigatoriedade de campos", () => {
  it("aceita payload completo com campos obrigatórios preenchidos", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando email não é enviado", async () => {
    const errors = await validate(buildDto({ email: undefined }));

    expect(errors.find((e) => e.property === "email")).toBeDefined();
  });

  it("rejeita quando birthDate não é enviado", async () => {
    const errors = await validate(buildDto({ birthDate: undefined }));

    expect(errors.find((e) => e.property === "birthDate")).toBeDefined();
  });

  it("rejeita quando address não é enviado", async () => {
    const errors = await validate(buildDto({ address: undefined }));

    expect(errors.find((e) => e.property === "address")).toBeDefined();
  });

  it("rejeita quando number não é enviado", async () => {
    const errors = await validate(buildDto({ number: undefined }));

    expect(errors.find((e) => e.property === "number")).toBeDefined();
  });

  it("rejeita quando city não é enviado", async () => {
    const errors = await validate(buildDto({ city: undefined }));

    expect(errors.find((e) => e.property === "city")).toBeDefined();
  });

  it("rejeita quando state não é enviado", async () => {
    const errors = await validate(buildDto({ state: undefined }));

    expect(errors.find((e) => e.property === "state")).toBeDefined();
  });

  it("rejeita birthDate fora do formato YYYY-MM-DD", async () => {
    const errors = await validate(buildDto({ birthDate: "16/07/2026" }));

    expect(errors.find((e) => e.property === "birthDate")).toBeDefined();
  });
});
