import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { TransferDto, TRANSFER_METHODS } from "./transfer.dto";

function buildInput(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    fromMethod: "cash",
    toMethod: "bank_transfer",
    amountCents: 5000,
    ...overrides,
  };
}

describe("TransferDto", () => {
  it("aceita fromMethod/toMethod dentro de cash/bank_transfer", async () => {
    const dto = plainToInstance(TransferDto, buildInput());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejeita fromMethod fora de cash/bank_transfer (ex.: credit_card)", async () => {
    const dto = plainToInstance(
      TransferDto,
      buildInput({ fromMethod: "credit_card" }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "fromMethod")).toBeDefined();
  });

  it("rejeita toMethod fora de cash/bank_transfer (ex.: credits)", async () => {
    const dto = plainToInstance(
      TransferDto,
      buildInput({
        toMethod: "credits" as unknown as (typeof TRANSFER_METHODS)[number],
      }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "toMethod")).toBeDefined();
  });
});
