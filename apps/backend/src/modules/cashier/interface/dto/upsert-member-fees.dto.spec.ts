import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpsertMemberFeesDto } from "./upsert-member-fees.dto";

function buildItem(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    userId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
    paymentMethod: "credit_card",
    percent: "2.50",
    fixedCents: 40,
    ...overrides,
  };
}

function buildInput(
  items: Record<string, unknown>[] = [buildItem()],
): Record<string, unknown> {
  return { fees: items };
}

describe("UpsertMemberFeesDto", () => {
  it("aceita item com credit_card/debit_card, percent string e fixedCents inteiro", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([
        buildItem(),
        buildItem({ paymentMethod: "debit_card", percent: "0", fixedCents: 0 }),
      ]),
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("aceita lista vazia (no-op)", async () => {
    const dto = plainToInstance(UpsertMemberFeesDto, buildInput([]));

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejeita paymentMethod fora de credit_card/debit_card (ex.: cash)", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([buildItem({ paymentMethod: "cash" })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita percent acima de 100", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([buildItem({ percent: "150" })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita percent como number", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([buildItem({ percent: 2.5 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita fixedCents negativo", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([buildItem({ fixedCents: -1 })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita userId que não é UUID", async () => {
    const dto = plainToInstance(
      UpsertMemberFeesDto,
      buildInput([buildItem({ userId: "not-a-uuid" })]),
    );

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("aceita deactivations com item válido (userId uuid + credit_card/debit_card)", async () => {
    const dto = plainToInstance(UpsertMemberFeesDto, {
      fees: [buildItem()],
      deactivations: [
        {
          userId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
          paymentMethod: "credit_card",
        },
        {
          userId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
          paymentMethod: "debit_card",
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("aceita payload só com deactivations (sem fees)", async () => {
    const dto = plainToInstance(UpsertMemberFeesDto, {
      deactivations: [
        {
          userId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
          paymentMethod: "credit_card",
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("rejeita deactivations com paymentMethod fora de credit_card/debit_card (ex.: cash)", async () => {
    const dto = plainToInstance(UpsertMemberFeesDto, {
      deactivations: [
        {
          userId: "3f1e8c9a-1b2c-4d5e-8f90-1a2b3c4d5e6f",
          paymentMethod: "cash",
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });

  it("rejeita deactivations com userId que não é UUID", async () => {
    const dto = plainToInstance(UpsertMemberFeesDto, {
      deactivations: [{ userId: "not-a-uuid", paymentMethod: "credit_card" }],
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
  });
});
