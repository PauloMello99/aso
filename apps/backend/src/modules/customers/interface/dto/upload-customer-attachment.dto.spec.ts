import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UploadCustomerAttachmentDto } from "./upload-customer-attachment.dto";

function buildDto(
  overrides: Record<string, unknown> = {},
): UploadCustomerAttachmentDto {
  return plainToInstance(UploadCustomerAttachmentDto, { ...overrides });
}

describe("UploadCustomerAttachmentDto", () => {
  it("aceita ausência de baseName (retrocompatível)", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("aceita um baseName válido", async () => {
    const errors = await validate(buildDto({ baseName: "documento" }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita baseName vazio quando enviado", async () => {
    const errors = await validate(buildDto({ baseName: "" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo apenas espaços quando enviado", async () => {
    const errors = await validate(buildDto({ baseName: "   " }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo separador de path", async () => {
    const errors = await validate(buildDto({ baseName: "foo/bar" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName com mais de 200 caracteres", async () => {
    const errors = await validate(buildDto({ baseName: "a".repeat(201) }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });
});
