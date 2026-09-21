import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpsertFeesDto } from "./upsert-fees.dto";

function buildItem(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    paymentMethod: "credit_card",
    percent: "2.50",
    fixedCents: 40,
    installments: 1,
    ...overrides,
  };
}

function buildInput(
  items: Record<string, unknown>[] = [buildItem()],
): Record<string, unknown> {
  return { fees: items };
}

describe("UpsertFeesDto", () => {
  it("aceita item com installments 1 em qualquer método (cash, bank_transfer, credit_card, debit_card)", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([
        buildItem({ paymentMethod: "cash" }),
        buildItem({ paymentMethod: "bank_transfer" }),
        buildItem({ paymentMethod: "credit_card" }),
        buildItem({ paymentMethod: "debit_card" }),
      ]),
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("aceita installments 6 com paymentMethod credit_card", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([
        buildItem({ paymentMethod: "credit_card", installments: 6 }),
      ]),
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejeita installments 6 com paymentMethod cash (não parcelável)", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([buildItem({ paymentMethod: "cash", installments: 6 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita installments 6 com paymentMethod debit_card (não parcelável)", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([
        buildItem({ paymentMethod: "debit_card", installments: 6 }),
      ]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita installments 0", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([buildItem({ installments: 0 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita installments 13 (acima do teto MAX_INSTALLMENTS=12)", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([buildItem({ installments: 13 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita installments não inteiro", async () => {
    const dto = plainToInstance(
      UpsertFeesDto,
      buildInput([buildItem({ installments: 1.5 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });
});
