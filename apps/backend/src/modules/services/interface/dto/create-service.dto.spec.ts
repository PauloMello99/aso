import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateServiceDto } from "./create-service.dto";

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    serviceTypeId: "9c3f6f0e-2f1a-4b4a-8c9d-1a2b3c4d5e6f",
    amountCents: 10000,
    paymentMethod: "cash",
    paymentStatus: "pending",
    materials: [{ materialId: "0f1e2d3c-4b5a-4a3b-8c1d-1a2b3c4d5e6f" }],
    ...overrides,
  };
}

function buildDto(overrides: Record<string, unknown> = {}): CreateServiceDto {
  return plainToInstance(CreateServiceDto, buildPayload(overrides));
}

describe("CreateServiceDto obrigatoriedade de campos", () => {
  it("aceita payload completo com campos obrigatórios preenchidos", async () => {
    const errors = await validate(buildDto());

    expect(errors).toHaveLength(0);
  });

  it("rejeita quando serviceTypeId não é enviado (N14)", async () => {
    const errors = await validate(buildDto({ serviceTypeId: undefined }));

    expect(errors.find((e) => e.property === "serviceTypeId")).toBeDefined();
  });

  it("rejeita quando serviceTypeId não é um UUID válido", async () => {
    const errors = await validate(buildDto({ serviceTypeId: "not-a-uuid" }));

    expect(errors.find((e) => e.property === "serviceTypeId")).toBeDefined();
  });

  it("rejeita quantity fracionária em material line (N15)", async () => {
    const errors = await validate(
      buildDto({
        materials: [
          {
            materialId: "0f1e2d3c-4b5a-4a3b-8c1d-1a2b3c4d5e6f",
            quantity: 1.5,
          },
        ],
      }),
    );

    const materialsError = errors.find((e) => e.property === "materials");
    expect(materialsError).toBeDefined();
  });

  it("aceita quantity inteira em material line", async () => {
    const errors = await validate(
      buildDto({
        materials: [
          {
            materialId: "0f1e2d3c-4b5a-4a3b-8c1d-1a2b3c4d5e6f",
            quantity: 2,
          },
        ],
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it("aceita material line sem quantity (linha shareable com finished)", async () => {
    const errors = await validate(
      buildDto({
        materials: [
          {
            materialId: "0f1e2d3c-4b5a-4a3b-8c1d-1a2b3c4d5e6f",
            finished: true,
          },
        ],
      }),
    );

    expect(errors).toHaveLength(0);
  });
});
