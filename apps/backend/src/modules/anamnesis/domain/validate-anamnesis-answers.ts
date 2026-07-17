import type { AnamnesisQuestion } from "./anamnesis-question";
import type { AnamnesisAnswer } from "./anamnesis-response.entity";
import { AnamnesisInvalidAnswersException } from "./exceptions/anamnesis-invalid-answers.exception";

/**
 * Valida as respostas recebidas contra o snapshot de perguntas da resposta.
 * Pura (sem I/O) — lança `AnamnesisInvalidAnswersException` se:
 *  (a) algum `questionId` não existir no snapshot;
 *  (b) o tipo do `value` não bater com o tipo da pergunta;
 *  (c) uma pergunta `required` estiver sem valor.
 * Retorna as respostas normalizadas, só as que existem no snapshot, na ordem
 * das perguntas (não na ordem em que chegaram).
 */
export function validateAnamnesisAnswers(
  questions: AnamnesisQuestion[],
  answers: AnamnesisAnswer[],
): AnamnesisAnswer[] {
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  const questionIds = new Set(questions.map((q) => q.id));

  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      throw new AnamnesisInvalidAnswersException(
        `unknown question: ${answer.questionId}`,
      );
    }
  }

  const normalized: AnamnesisAnswer[] = [];
  for (const question of questions) {
    const answer = answersByQuestionId.get(question.id);
    const value = answer?.value;
    const isEmpty = value === undefined || value === null || value === "";

    if (question.required && isEmpty) {
      throw new AnamnesisInvalidAnswersException(
        `required question not answered: ${question.id}`,
      );
    }

    if (isEmpty) continue;

    if (question.type === "yes_no" && typeof value !== "boolean") {
      throw new AnamnesisInvalidAnswersException(
        `question ${question.id} expects a boolean value`,
      );
    }
    if (question.type === "text" && typeof value !== "string") {
      throw new AnamnesisInvalidAnswersException(
        `question ${question.id} expects a string value`,
      );
    }

    normalized.push({ questionId: question.id, value: value! });
  }

  return normalized;
}
