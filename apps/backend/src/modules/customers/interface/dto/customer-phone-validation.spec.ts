import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateCustomerDto } from "./create-customer.dto";

function buildDto(phone: string | null | undefined): CreateCustomerDto {
  return plainToInstance(CreateCustomerDto, {
    name: "Cliente Teste",
    phone,
  });
}

describe("CreateCustomerDto phone validation", () => {
  it("aceita telefone em E.164 com código de país", async () => {
    const errors = await validate(buildDto("+5511999998888"));

    expect(errors.find((e) => e.property === "phone")).toBeUndefined();
  });

  it("rejeita telefone sem código de país", async () => {
    const errors = await validate(buildDto("11999998888"));

    expect(errors.find((e) => e.property === "phone")).toBeDefined();
  });

  it("rejeita telefone com valor não numérico", async () => {
    const errors = await validate(buildDto("abc"));

    expect(errors.find((e) => e.property === "phone")).toBeDefined();
  });

  it("aceita phone undefined (campo opcional)", async () => {
    const errors = await validate(buildDto(undefined));

    expect(errors.find((e) => e.property === "phone")).toBeUndefined();
  });

  it("aceita phone null (campo opcional)", async () => {
    const errors = await validate(buildDto(null));

    expect(errors.find((e) => e.property === "phone")).toBeUndefined();
  });

  it("aceita fixo BR (8 dígitos + DDD)", async () => {
    const errors = await validate(buildDto("+551133334444"));

    expect(errors.find((e) => e.property === "phone")).toBeUndefined();
  });

  it("aceita celular BR de outro DDD (86 - Piauí)", async () => {
    const errors = await validate(buildDto("+5586987654321"));

    expect(errors.find((e) => e.property === "phone")).toBeUndefined();
  });

  it("rejeita celular BR sem o 9º dígito (formato antigo, pós-migração ANATEL)", async () => {
    const errors = await validate(buildDto("+551187654321"));

    expect(errors.find((e) => e.property === "phone")).toBeDefined();
  });

  it("rejeita número com dígitos insuficientes", async () => {
    const errors = await validate(buildDto("+55119876543"));

    expect(errors.find((e) => e.property === "phone")).toBeDefined();
  });
});
