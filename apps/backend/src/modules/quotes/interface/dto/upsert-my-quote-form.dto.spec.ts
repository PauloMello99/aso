import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpsertMyQuoteFormDto } from "./upsert-my-quote-form.dto";

async function run(overrides: Record<string, unknown> = {}) {
  const dto = plainToInstance(UpsertMyQuoteFormDto, {
    slug: "maria",
    displayName: "Maria",
    enabled: true,
    ...overrides,
  });
  return { dto, errors: await validate(dto, { whitelist: true }) };
}

describe("UpsertMyQuoteFormDto", () => {
  it("accepts a valid body and trims displayName", async () => {
    const { dto, errors } = await run({ displayName: "  Maria  " });
    expect(errors).toHaveLength(0);
    expect(dto.displayName).toBe("Maria");
  });

  it("rejects a whitespace-only displayName (validation error, not 500)", async () => {
    const { errors } = await run({ displayName: "   " });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects displayName over 80 chars and slug over 40 chars", async () => {
    expect((await run({ displayName: "x".repeat(81) })).errors.length).toBeGreaterThan(0);
    expect((await run({ slug: "x".repeat(41) })).errors.length).toBeGreaterThan(0);
  });
});
