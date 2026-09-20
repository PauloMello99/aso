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

  it("rejeita amountCents acima do teto int32 (evita 500 de overflow no Postgres)", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ amountCents: 9999999999 }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "amountCents")).toBeDefined();
  });

  it("aceita amountCents exatamente no teto int32", async () => {
    const dto = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ amountCents: 2147483647 }),
    );

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === "amountCents")).toBeUndefined();
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

  it("rejeita data inexistente no calendario (2026-13-45 e 2026-02-30) com 400, não 500 do CHECK", async () => {
    const badStart = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2026-13-45" }),
    );
    const badEnd = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodEnd: "2026-02-30" }),
    );

    expect(
      (await validate(badStart)).find((e) => e.property === "periodStart"),
    ).toBeDefined();
    expect(
      (await validate(badEnd)).find((e) => e.property === "periodEnd"),
    ).toBeDefined();
  });

  it("aceita 29/02 em ano bissexto e rejeita em ano comum", async () => {
    const leap = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2028-02-29", periodEnd: "2028-02-29" }),
    );
    const common = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2027-02-29" }),
    );

    expect(await validate(leap)).toHaveLength(0);
    expect(
      (await validate(common)).find((e) => e.property === "periodStart"),
    ).toBeDefined();
  });

  it("rejeita período invertido (periodStart > periodEnd) e aceita início igual ao fim", async () => {
    const inverted = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2026-09-30", periodEnd: "2026-09-01" }),
    );
    const sameDay = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2026-09-01", periodEnd: "2026-09-01" }),
    );

    expect(
      (await validate(inverted)).find((e) => e.property === "periodEnd"),
    ).toBeDefined();
    expect(await validate(sameDay)).toHaveLength(0);
  });

  it("não compara período quando só um dos lados é informado", async () => {
    const onlyStart = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodStart: "2026-09-30" }),
    );
    const onlyEnd = plainToInstance(
      CreateMemberPaymentDto,
      buildInput({ periodEnd: "2026-09-01" }),
    );

    expect(await validate(onlyStart)).toHaveLength(0);
    expect(await validate(onlyEnd)).toHaveLength(0);
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
