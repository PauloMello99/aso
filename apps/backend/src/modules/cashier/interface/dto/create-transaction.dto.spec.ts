import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateTransactionDto, PAYMENT_METHODS } from "./create-transaction.dto";

function buildInput(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    description: "Venda balcão",
    type: "income",
    grossCents: 10000,
    paymentMethod: "cash",
    ...overrides,
  };
}

describe("CreateTransactionDto", () => {
  it("aceita paymentMethod válido (cash)", async () => {
    const dto = plainToInstance(CreateTransactionDto, buildInput());

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "paymentMethod")).toBeUndefined();
  });

  it("rejeita 'credits' (removido do enum)", async () => {
    const dto = plainToInstance(
      CreateTransactionDto,
      buildInput({
        paymentMethod: "credits" as unknown as (typeof PAYMENT_METHODS)[number],
      }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "paymentMethod")).toBeDefined();
  });
});
