import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RenameCustomerAttachmentDto } from "./rename-customer-attachment.dto";

function buildDto(
  overrides: Record<string, unknown> = {},
): RenameCustomerAttachmentDto {
  return plainToInstance(RenameCustomerAttachmentDto, { ...overrides });
}

describe("RenameCustomerAttachmentDto", () => {
  it("aceita um baseName válido", async () => {
    const errors = await validate(buildDto({ baseName: "documento" }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita baseName vazio", async () => {
    const errors = await validate(buildDto({ baseName: "" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo apenas espaços", async () => {
    const errors = await validate(buildDto({ baseName: "   " }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName ausente", async () => {
    const errors = await validate(buildDto());

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("aceita baseName com exatamente 200 caracteres", async () => {
    const errors = await validate(buildDto({ baseName: "a".repeat(200) }));

    expect(errors).toHaveLength(0);
  });

  it("rejeita baseName com mais de 200 caracteres", async () => {
    const errors = await validate(buildDto({ baseName: "a".repeat(201) }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo separador de path", async () => {
    const errors = await validate(buildDto({ baseName: "foo/bar" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo barra invertida", async () => {
    const errors = await validate(buildDto({ baseName: "foo\\bar" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("rejeita baseName contendo caractere de controle", async () => {
    const errors = await validate(buildDto({ baseName: "foo\x00bar" }));

    expect(errors.find((e) => e.property === "baseName")).toBeDefined();
  });

  it("aceita baseName com extensão embutida (é só um nome-base comum)", async () => {
    const errors = await validate(buildDto({ baseName: "documento.pdf" }));

    expect(errors).toHaveLength(0);
  });
});
