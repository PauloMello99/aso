import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RenameCustomerAttachmentDto } from "./rename-customer-attachment.dto";

function buildDto(
  overrides: Record<string, unknown> = {},
): RenameCustomerAttachmentDto {
  return plainToInstance(RenameCustomerAttachmentDto, { ...overrides });
}

describe("RenameCustomerAttachmentDto", () => {
  it("aceita um fileName válido", async () => {
    const errors = await validate(buildDto({ fileName: "documento.pdf" }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita fileName vazio", async () => {
    const errors = await validate(buildDto({ fileName: "" }));

    expect(errors.find((e) => e.property === "fileName")).toBeDefined();
  });

  it("rejeita fileName contendo apenas espaços", async () => {
    const errors = await validate(buildDto({ fileName: "   " }));

    expect(errors.find((e) => e.property === "fileName")).toBeDefined();
  });

  it("rejeita fileName ausente", async () => {
    const errors = await validate(buildDto());

    expect(errors.find((e) => e.property === "fileName")).toBeDefined();
  });

  it("aceita fileName com exatamente 255 caracteres", async () => {
    const errors = await validate(buildDto({ fileName: "a".repeat(255) }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita fileName com mais de 255 caracteres", async () => {
    const errors = await validate(buildDto({ fileName: "a".repeat(256) }));

    expect(errors.find((e) => e.property === "fileName")).toBeDefined();
  });
});
