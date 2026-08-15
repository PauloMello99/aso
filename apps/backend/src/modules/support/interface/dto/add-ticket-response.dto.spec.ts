import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AddTicketResponseDto } from "./add-ticket-response.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    body: "Obrigado pelo retorno, aguardo novidades.",
    ...overrides,
  };
}

function buildDto(
  overrides: Record<string, unknown> = {},
): AddTicketResponseDto {
  return plainToInstance(AddTicketResponseDto, buildPayload(overrides));
}

describe("AddTicketResponseDto obrigatoriedade e limites de campos", () => {
  it("aceita payload válido", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando body não é enviado", async () => {
    const errors = await validate(buildDto({ body: undefined }));

    expect(errors.find((e) => e.property === "body")).toBeDefined();
  });

  it("rejeita body vazio", async () => {
    const errors = await validate(buildDto({ body: "" }));

    expect(errors.find((e) => e.property === "body")).toBeDefined();
  });

  it("rejeita body acima do máximo de 5000 caracteres", async () => {
    const errors = await validate(buildDto({ body: "a".repeat(5001) }));

    expect(errors.find((e) => e.property === "body")).toBeDefined();
  });
});
