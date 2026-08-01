import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateCustomerDto } from "./update-customer.dto";

function buildDto(
  overrides: Record<string, unknown> = {},
): UpdateCustomerDto {
  return plainToInstance(UpdateCustomerDto, { ...overrides });
}

describe("UpdateCustomerDto rejeição de null explícito", () => {
  it("aceita payload vazio (todos os campos omitidos)", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("aceita quando apenas email é enviado com valor válido", async () => {
    const errors = await validate(buildDto({ email: "novo@teste.com" }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando email é enviado como null", async () => {
    const errors = await validate(buildDto({ email: null }));

    expect(errors.find((e) => e.property === "email")).toBeDefined();
  });

  it("rejeita quando birthDate é enviado como null", async () => {
    const errors = await validate(buildDto({ birthDate: null }));

    expect(errors.find((e) => e.property === "birthDate")).toBeDefined();
  });

  it("rejeita quando address é enviado como null", async () => {
    const errors = await validate(buildDto({ address: null }));

    expect(errors.find((e) => e.property === "address")).toBeDefined();
  });

  it("rejeita quando number é enviado como null", async () => {
    const errors = await validate(buildDto({ number: null }));

    expect(errors.find((e) => e.property === "number")).toBeDefined();
  });

  it("rejeita quando city é enviado como null", async () => {
    const errors = await validate(buildDto({ city: null }));

    expect(errors.find((e) => e.property === "city")).toBeDefined();
  });

  it("rejeita quando state é enviado como null", async () => {
    const errors = await validate(buildDto({ state: null }));

    expect(errors.find((e) => e.property === "state")).toBeDefined();
  });

  it("rejeita quando email é enviado como string vazia", async () => {
    const errors = await validate(buildDto({ email: "" }));

    expect(errors.find((e) => e.property === "email")).toBeDefined();
  });
});
