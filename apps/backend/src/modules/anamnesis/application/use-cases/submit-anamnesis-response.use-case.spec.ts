import {
  SubmitAnamnesisResponseUseCase,
  SubmitAnamnesisResponseInput,
} from "./submit-anamnesis-response.use-case";
import { IAnamnesisResponseRepository } from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseAlreadySubmittedException } from "../../domain/exceptions/anamnesis-response-already-submitted.exception";
import { AnamnesisResponseExpiredException } from "../../domain/exceptions/anamnesis-response-expired.exception";
import { AnamnesisInvalidAnswersException } from "../../domain/exceptions/anamnesis-invalid-answers.exception";
import { AnamnesisSignatureRequiredException } from "../../domain/exceptions/anamnesis-signature-required.exception";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import { IStorageProvider } from "../../../auth/application/ports/storage-provider.interface";
import { IAnamnesisDocumentGenerator } from "../../domain/ports/anamnesis-document-generator.port";
import { MailService } from "../../../mail/application/mail.service";

const VALID_SIGNATURE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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
  return Object.assign(entity, {
    customerName: "Maria Silva",
    customerEmail: "maria@example.com",
  });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<IAnamnesisResponseRepository>> = {},
): jest.Mocked<IAnamnesisResponseRepository> {
  return {
    create: jest.fn(),
    deletePendingFor: jest.fn(),
    delete: jest.fn(),
    findByToken: jest.fn(),
    markSubmitted: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    findLinkable: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisResponseRepository>;
}

function buildFakeStorage(
  overrides: Partial<jest.Mocked<IStorageProvider>> = {},
): jest.Mocked<IStorageProvider> {
  return {
    uploadAvatar: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue("path"),
    createSignedUrl: jest.fn().mockResolvedValue("https://signed.example.com/file.pdf"),
    removeFile: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStorageProvider>;
}

function buildFakeDocumentGenerator(
  overrides: Partial<jest.Mocked<IAnamnesisDocumentGenerator>> = {},
): jest.Mocked<IAnamnesisDocumentGenerator> {
  return {
    generate: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisDocumentGenerator>;
}

function buildFakeMail(
  overrides: Partial<jest.Mocked<MailService>> = {},
): jest.Mocked<MailService> {
  return {
    sendSignedAnamnesisResponseCopy: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as jest.Mocked<MailService>;
}

function buildInput(
  overrides: Partial<SubmitAnamnesisResponseInput> = {},
): SubmitAnamnesisResponseInput {
  return {
    token: "token-1",
    answers: [{ questionId: "q-1", value: "Nenhuma" }],
    signerFullName: "Maria Silva",
    signerCpf: null,
    signatureImageBase64: VALID_SIGNATURE_BASE64,
    requestIp: "203.0.113.1",
    requestUserAgent: "jest-test-agent",
    ...overrides,
  };
}

describe("SubmitAnamnesisResponseUseCase", () => {
  it("lança AnamnesisResponseNotFoundException quando o token não existe", async () => {
    const repo = buildFakeRepo({ findByToken: jest.fn().mockResolvedValue(null) });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      buildFakeMail(),
    );

    await expect(
      useCase.execute(buildInput({ token: "missing", answers: [] })),
    ).rejects.toBeInstanceOf(AnamnesisResponseNotFoundException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseAlreadySubmittedException quando já foi enviada", async () => {
    const repo = buildFakeRepo({
      findByToken: jest
        .fn()
        .mockResolvedValue(buildResponse({ status: "submitted" })),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      buildFakeMail(),
    );

    await expect(
      useCase.execute(buildInput({ answers: [] })),
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
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      buildFakeMail(),
    );

    await expect(
      useCase.execute(buildInput({ answers: [] })),
    ).rejects.toBeInstanceOf(AnamnesisResponseExpiredException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisInvalidAnswersException quando as respostas são inválidas", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(buildResponse()),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      buildFakeMail(),
    );

    await expect(
      useCase.execute(buildInput({ answers: [] })),
    ).rejects.toBeInstanceOf(AnamnesisInvalidAnswersException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisSignatureRequiredException quando a assinatura não é um PNG válido", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(buildResponse()),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      buildFakeMail(),
    );

    await expect(
      useCase.execute(
        buildInput({ signatureImageBase64: "data:image/png;base64,aGVsbG8=" }),
      ),
    ).rejects.toBeInstanceOf(AnamnesisSignatureRequiredException);
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("normaliza, gera o PDF, sobe os artefatos e marca como enviada em caso de sucesso", async () => {
    const response = buildResponse();
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(response),
    });
    const storage = buildFakeStorage();
    const documentGenerator = buildFakeDocumentGenerator();
    const mail = buildFakeMail();
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      storage,
      documentGenerator,
      mail,
    );

    await useCase.execute(buildInput());

    const signaturePathPattern =
      /^org-1\/response-1\/[0-9a-f-]{36}-signature\.png$/;
    const pdfPathPattern =
      /^org-1\/response-1\/[0-9a-f-]{36}-signed-form\.pdf$/;

    expect(documentGenerator.generate).toHaveBeenCalledTimes(1);
    expect(storage.uploadFile).toHaveBeenCalledTimes(2);
    expect(storage.uploadFile).toHaveBeenCalledWith(
      "anamnesis-documents",
      expect.stringMatching(signaturePathPattern),
      expect.any(Buffer),
      "image/png",
    );
    expect(storage.uploadFile).toHaveBeenCalledWith(
      "anamnesis-documents",
      expect.stringMatching(pdfPathPattern),
      expect.any(Buffer),
      "application/pdf",
    );

    expect(repo.markSubmitted).toHaveBeenCalledWith("response-1", {
      answers: [{ questionId: "q-1", value: "Nenhuma" }],
      signerFullName: "Maria Silva",
      signerCpf: null,
      signatureStoragePath: expect.stringMatching(signaturePathPattern),
      pdfStoragePath: expect.stringMatching(pdfPathPattern),
      pdfHashSha256: expect.any(String),
      requestIp: "203.0.113.1",
      requestUserAgent: "jest-test-agent",
    });

    expect(mail.sendSignedAnamnesisResponseCopy).toHaveBeenCalledWith({
      to: "maria@example.com",
      customerName: "Maria Silva",
      pdfUrl: "https://signed.example.com/file.pdf",
    });
  });

  it("lança AnamnesisSignatureRequiredException quando a geração do PDF falha (corpo da imagem corrompido além do magic number)", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(buildResponse()),
    });
    const documentGenerator = buildFakeDocumentGenerator({
      generate: jest.fn().mockRejectedValue(new Error("pdfkit decode error")),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      documentGenerator,
      buildFakeMail(),
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisSignatureRequiredException,
    );
    expect(repo.markSubmitted).not.toHaveBeenCalled();
  });

  it("lança AnamnesisResponseAlreadySubmittedException quando outra submissão concorrente vence a corrida (markSubmitted afeta 0 linhas)", async () => {
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(buildResponse()),
      markSubmitted: jest.fn().mockResolvedValue(false),
    });
    const mail = buildFakeMail();
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      buildFakeStorage(),
      buildFakeDocumentGenerator(),
      mail,
    );

    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(
      AnamnesisResponseAlreadySubmittedException,
    );
    expect(mail.sendSignedAnamnesisResponseCopy).not.toHaveBeenCalled();
  });

  it("resolve normalmente mesmo se o envio de e-mail falhar (best-effort, pós-registro)", async () => {
    const response = buildResponse();
    const repo = buildFakeRepo({
      findByToken: jest.fn().mockResolvedValue(response),
    });
    const storage = buildFakeStorage();
    const documentGenerator = buildFakeDocumentGenerator();
    const mail = buildFakeMail({
      sendSignedAnamnesisResponseCopy: jest
        .fn()
        .mockRejectedValue(new Error("resend indisponível")),
    });
    const useCase = new SubmitAnamnesisResponseUseCase(
      repo,
      storage,
      documentGenerator,
      mail,
    );

    await expect(useCase.execute(buildInput())).resolves.toBeUndefined();
    expect(repo.markSubmitted).toHaveBeenCalledTimes(1);
  });
});
