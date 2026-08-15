import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePublicTicketDto } from "./create-public-ticket.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    requesterName: "Maria da Silva",
    requesterEmail: "maria@example.com",
    subject: "Assunto do chamado",
    description: "Descrição detalhada do problema relatado pelo cliente.",
    categorySystemKey: "billing",
    turnstileToken: "token-valido",
    ...overrides,
  };
}

function buildDto(
  overrides: Record<string, unknown> = {},
): CreatePublicTicketDto {
  return plainToInstance(CreatePublicTicketDto, buildPayload(overrides));
}

describe("CreatePublicTicketDto obrigatoriedade e limites de campos", () => {
  it("aceita payload completo com campos obrigatórios preenchidos", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita requesterName abaixo do mínimo de 2 caracteres", async () => {
    const errors = await validate(buildDto({ requesterName: "M" }));

    expect(
      errors.find((e) => e.property === "requesterName"),
    ).toBeDefined();
  });

  it("rejeita requesterName acima do máximo de 120 caracteres", async () => {
    const errors = await validate(
      buildDto({ requesterName: "a".repeat(121) }),
    );

    expect(
      errors.find((e) => e.property === "requesterName"),
    ).toBeDefined();
  });

  it("rejeita requesterEmail com formato inválido", async () => {
    const errors = await validate(
      buildDto({ requesterEmail: "nao-e-um-email" }),
    );

    expect(
      errors.find((e) => e.property === "requesterEmail"),
    ).toBeDefined();
  });

  it("rejeita quando categorySystemKey não é enviado", async () => {
    const errors = await validate(buildDto({ categorySystemKey: undefined }));

    expect(
      errors.find((e) => e.property === "categorySystemKey"),
    ).toBeDefined();
  });

  it("rejeita categorySystemKey vazio", async () => {
    const errors = await validate(buildDto({ categorySystemKey: "" }));

    expect(
      errors.find((e) => e.property === "categorySystemKey"),
    ).toBeDefined();
  });

  it("rejeita subject abaixo do mínimo de 5 caracteres", async () => {
    const errors = await validate(buildDto({ subject: "Oi" }));

    expect(errors.find((e) => e.property === "subject")).toBeDefined();
  });

  it("rejeita subject acima do máximo de 200 caracteres", async () => {
    const errors = await validate(buildDto({ subject: "a".repeat(201) }));

    expect(errors.find((e) => e.property === "subject")).toBeDefined();
  });

  it("rejeita description abaixo do mínimo de 10 caracteres", async () => {
    const errors = await validate(buildDto({ description: "curta" }));

    expect(errors.find((e) => e.property === "description")).toBeDefined();
  });

  it("rejeita description acima do máximo de 5000 caracteres", async () => {
    const errors = await validate(
      buildDto({ description: "a".repeat(5001) }),
    );

    expect(errors.find((e) => e.property === "description")).toBeDefined();
  });

  it("rejeita quando turnstileToken não é enviado", async () => {
    const errors = await validate(buildDto({ turnstileToken: undefined }));

    expect(
      errors.find((e) => e.property === "turnstileToken"),
    ).toBeDefined();
  });

  it("rejeita turnstileToken vazio", async () => {
    const errors = await validate(buildDto({ turnstileToken: "" }));

    expect(
      errors.find((e) => e.property === "turnstileToken"),
    ).toBeDefined();
  });

  // orgId, priority e status não são propriedades declaradas do DTO: o
  // ValidationPipe global (whitelist: true, main.ts) as descarta em runtime.
  // O formulário público nunca deve poder definir esses campos.
});
