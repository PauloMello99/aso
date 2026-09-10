import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateMaterialDto } from "./create-material.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Tinta preta",
    ...overrides,
  };
}

function buildDto(overrides: Record<string, unknown> = {}): CreateMaterialDto {
  return plainToInstance(CreateMaterialDto, buildPayload(overrides));
}

describe("CreateMaterialDto obrigatoriedade de campos", () => {
  it("aceita payload completo com campos obrigatórios preenchidos", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando name não é enviado", async () => {
    const errors = await validate(buildDto({ name: undefined }));

    expect(errors.find((e) => e.property === "name")).toBeDefined();
  });

  it("aceita serviceTypeIds ausente", async () => {
    const errors = await validate(buildDto());

    expect(errors.find((e) => e.property === "serviceTypeIds")).toBeUndefined();
  });

  it("aceita serviceTypeIds com UUIDs válidos", async () => {
    const errors = await validate(
      buildDto({
        serviceTypeIds: [
          "9c3f6f0e-2f1a-4b4a-8c9d-1a2b3c4d5e6f",
          "0f1e2d3c-4b5a-4a3b-8c1d-1a2b3c4d5e6f",
        ],
      }),
    );

    expect(errors.find((e) => e.property === "serviceTypeIds")).toBeUndefined();
  });

  it("rejeita serviceTypeIds com item que não é UUID", async () => {
    const errors = await validate(
      buildDto({ serviceTypeIds: ["not-a-uuid"] }),
    );

    expect(errors.find((e) => e.property === "serviceTypeIds")).toBeDefined();
  });

  it("rejeita serviceTypeIds que não é um array", async () => {
    const errors = await validate(
      buildDto({ serviceTypeIds: "9c3f6f0e-2f1a-4b4a-8c9d-1a2b3c4d5e6f" }),
    );

    expect(errors.find((e) => e.property === "serviceTypeIds")).toBeDefined();
  });
});
