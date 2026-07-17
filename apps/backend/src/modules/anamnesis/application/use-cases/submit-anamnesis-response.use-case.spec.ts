import { SubmitAnamnesisResponseUseCase } from "./submit-anamnesis-response.use-case";
import { IAnamnesisResponseRepository } from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseAlreadySubmittedException } from "../../domain/exceptions/anamnesis-response-already-submitted.exception";
import { AnamnesisResponseExpiredException } from "../../domain/exceptions/anamnesis-response-expired.exception";
import { AnamnesisInvalidAnswersException } from "../../domain/exceptions/anamnesis-invalid-answers.exception";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";

const questions: AnamnesisQuestion[] = [
  { id: "q-1", type: "text", label: "Alergias?", required: true },
];

function buildResponse(
  overrides: Partial<Parameters<typeof AnamnesisResponseEntity.create>[0]> = {},
) {
  const entity = AnamnesisResponseEntity.create({
    id: "response-1",
    orgId: "org-1",
    formVersionId: "version-1",
    serviceTypeId: "type-1",
    customerId: "customer-1",
    questionsSnapshot: questions,
    token: "token-1",
    expiresAt: new Date("2999-01-01T00:00:00Z"),
    status: "pending",
    answers: null,
    submittedAt: null,
    createdBy: "user-1",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  });
  return Object.assign(entity, { customerName: "Maria Silva" });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<IAnamnesisResponseRepository>> = {},
): jest.Mocked<IAnamnesisResponseRepository> {
  return {
    create: jest.fn(),
    deletePendingFor: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn(),
    findById: jest.fn(),
    findLinkable: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisResponseRepository>;
}

describe("SubmitAnamnesisResponseUseCase", () => {
  it("lança AnamnesisResponseNotFoundException quando o token não existe", async () => {
    const repo = buildFakeRepo({ findByToken: jest.fn().mockResolvedValue(null) });
    const useCase = new SubmitAnamnesisResponseUseCase(repo);

    await expect(
      useCase.execute({ token: "missing", answers: [] }),
    ).rejects.toBeInstanceOf(AnamnesisResponseNotFoundException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseAlreadySubmittedException quando já foi enviada", async () => {
    const repo = buildFakeRepo({
      findByToken: jest
        .fn()
        .mockResolvedValue(buildResponse({ status: "submitted" })),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(repo);

    await expect(
      useCase.execute({ token: "token-1", answers: [] }),
    ).rejects.toBeInstanceOf(AnamnesisResponseAlreadySubmittedException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseExpiredException quando pendente e expirada", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(
        buildResponse({
          status: "pending",
          expiresAt: new Date("2000-01-01T00:00:00Z"),
        }),
      ),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(repo);

    await expect(
      useCase.execute({ token: "token-1", answers: [] }),
    ).rejects.toBeInstanceOf(AnamnesisResponseExpiredException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisInvalidAnswersException quando as respostas são inválidas", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(buildResponse()),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(repo);

    await expect(
      useCase.execute({ token: "token-1", answers: [] }),
    ).rejects.toBeInstanceOf(AnamnesisInvalidAnswersException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("normaliza e marca como enviada em caso de sucesso", async () => {
    const response = buildResponse();
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(response),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(repo);

    await useCase.execute({
      token: "token-1",
      answers: [{ questionId: "q-1", value: "Nenhuma" }],
    });

    expect(repo.markSubmitted).toHaveBeenCalledWith("response-1", [
      { questionId: "q-1", value: "Nenhuma" },
    ]);
  });
});
