import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SubmitQuoteRequestDto } from "./submit-quote-request.dto";

const base = {
  name: "Joao Cliente",
  phone: "11999998888",
  email: "joao@example.com",
  idea: "Um leao",
  consentVersion: "v1",
  privacyConsent: "true",
  contactRetentionConsent: "false",
};

async function run(overrides: Record<string, unknown> = {}) {
  const dto = plainToInstance(SubmitQuoteRequestDto, { ...base, ...overrides });
  const errors = await validate(dto, { whitelist: true });
  return { dto, errors };
}

describe("SubmitQuoteRequestDto", () => {
  it("accepts multipart string booleans", async () => {
    const { dto, errors } = await run({
      privacyConsent: "true",
      contactRetentionConsent: "true",
    });
    expect(errors).toHaveLength(0);
    expect(dto.privacyConsent).toBe(true);
    expect(dto.contactRetentionConsent).toBe(true);
  });

  it("parses 'false' as false", async () => {
    const { dto, errors } = await run({ contactRetentionConsent: "false" });
    expect(errors).toHaveLength(0);
    expect(dto.contactRetentionConsent).toBe(false);
  });

  it("treats an ABSENT retention consent key as false", async () => {
    const plain: Record<string, unknown> = { ...base };
    delete plain.contactRetentionConsent;
    const dto = plainToInstance(SubmitQuoteRequestDto, plain);
    const errors = await validate(dto, { whitelist: true });
    expect(errors).toHaveLength(0);
    expect(dto.contactRetentionConsent).toBe(false);
  });

  it("treats an undefined retention consent as false", async () => {
    const { dto, errors } = await run({ contactRetentionConsent: undefined });
    expect(errors).toHaveLength(0);
    expect(dto.contactRetentionConsent).toBe(false);
  });

  it("strips phone mask", async () => {
    const { dto, errors } = await run({ phone: "(11) 99999-8888" });
    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe("11999998888");
  });

  it("keeps a leading + in the phone", async () => {
    const { dto, errors } = await run({ phone: "+55 (11) 99999-8888" });
    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe("+5511999998888");
  });

  it("rejects a too-short phone", async () => {
    const { errors } = await run({ phone: "12345" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("lowercases and trims the email", async () => {
    const { dto, errors } = await run({ email: "  Joao@Example.COM " });
    expect(errors).toHaveLength(0);
    expect(dto.email).toBe("joao@example.com");
  });

  it("rejects an invalid email", async () => {
    const { errors } = await run({ email: "not-an-email" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an empty idea and an oversized idea", async () => {
    expect((await run({ idea: "   " })).errors.length).toBeGreaterThan(0);
    expect((await run({ idea: "x".repeat(2001) })).errors.length).toBeGreaterThan(0);
  });
});
