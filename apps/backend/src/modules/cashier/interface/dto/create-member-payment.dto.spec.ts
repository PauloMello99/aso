import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateMemberPaymentDto } from "./create-member-payment.dto";
import { PAYMENT_METHODS } from "./create-transaction.dto";

function buildInput(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    amountCents: 10000,
    paymentMethod: "cash",
    ...overrides,
  };
}

describe("CreateMemberPaymentDto", () => {
  it("aceita o minimo obrigatorio (amountCents + paymentMethod)", async () => {
    const dto = plainToInstance(CreateMemberPaymentDto, buildInput());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("aceita paymentMethod valido (cash)", async () => {
    const dto = plainToInstance(CreateMemberPaymentDto, buildInput());

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "paymentMethod")).toBeUndefined();
  });

  it("rejeita paymentMethod fora do enum", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({
        paymentMethod: "credits" as unknown as (typeof PAYMENT_METHODS)[number],
      }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "paymentMethod")).toBeDefined();
  });

  it("rejeita amountCents zero ou negativo", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ amountCents: 0 }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "amountCents")).toBeDefined();
  });

  it("aceita description, periodStart e periodEnd opcionais quando ausentes", async () => {
    const dto = plainToInstance(CreateMemberPaymentDto, buildInput());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("aceita periodStart/periodEnd no formato YYYY-MM-DD", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2026-09-01", periodEnd: "2026-09-30" }),
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejeita periodStart fora do formato YYYY-MM-DD", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "01/09/2026" }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "periodStart")).toBeDefined();
  });

  it("rejeita periodEnd fora do formato YYYY-MM-DD", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodEnd: "30-09-2026" }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "periodEnd")).toBeDefined();
  });
});
