import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateTicketDto } from "./create-ticket.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    categorySystemKey: "billing",
    subject: "Assunto do chamado",
    description: "Descrição detalhada do problema relatado pelo cliente.",
    ...overrides,
  };
}

function buildDto(overrides: Record<string, unknown> = {}): CreateTicketDto {
  return plainToInstance(CreateTicketDto, buildPayload(overrides));
}

describe("CreateTicketDto obrigatoriedade e limites de campos", () => {
  it("aceita payload completo com campos obrigatórios preenchidos", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando categorySystemKey não é enviado", async () => {
    const errors = await validate(buildDto({ categorySystemKey: undefined }));

    expect(errors.find((e) => e.property === "categorySystemKey")).toBeDefined();
  });

  it("rejeita quando categorySystemKey é string vazia", async () => {
    const errors = await validate(buildDto({ categorySystemKey: "" }));

    expect(errors.find((e) => e.property === "categorySystemKey")).toBeDefined();
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
    const errors = await validate(buildDto({ description: "a".repeat(5001) }));

    expect(errors.find((e) => e.property === "description")).toBeDefined();
  });

  // orgId, status, requesterName e requesterEmail não são propriedades
  // declaradas do DTO: o ValidationPipe global (whitelist: true, main.ts)
  // as descarta em runtime. orgId vem da rota/sessão e requesterName/Email
  // são resolvidos no controller a partir do usuário autenticado.
});
