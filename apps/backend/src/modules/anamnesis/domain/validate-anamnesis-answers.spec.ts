import { validateAnamnesisAnswers } from "./validate-anamnesis-answers";
import { AnamnesisInvalidAnswersException } from "./exceptions/anamnesis-invalid-answers.exception";
import type { AnamnesisQuestion } from "./anamnesis-question";

const questions: AnamnesisQuestion[] = [
  { id: "q-required-text", type: "text", label: "Alergias?", required: true },
  {
    id: "q-optional-yesno",
    type: "yes_no",
    label: "Já fez tatuagem antes?",
    required: false,
  },
];

describe("validateAnamnesisAnswers", () => {
  it("lança quando uma pergunta required não foi respondida", () => {
    expect(() => validateAnamnesisAnswers(questions, [])).toThrow(
      AnamnesisInvalidAnswersException,
    );
  });

  it("lança quando um questionId desconhecido é enviado", () => {
    expect(() =>
      validateAnamnesisAnswers(questions, [
        { questionId: "q-required-text", value: "Nenhuma" },
        { questionId: "q-unknown", value: "x" },
      ]),
    ).toThrow(AnamnesisInvalidAnswersException);
  });

  it("lança quando o tipo do value não bate com o tipo da pergunta", () => {
    expect(() =>
      validateAnamnesisAnswers(questions, [
        { questionId: "q-required-text", value: "Nenhuma" },
        { questionId: "q-optional-yesno", value: "sim" as unknown as boolean },
      ]),
    ).toThrow(AnamnesisInvalidAnswersException);
  });

  it("normaliza respostas válidas na ordem das perguntas", () => {
    const result = validateAnamnesisAnswers(questions, [
      { questionId: "q-optional-yesno", value: true },
      { questionId: "q-required-text", value: "Nenhuma" },
    ]);

    expect(result).toEqual([
      { questionId: "q-required-text", value: "Nenhuma" },
      { questionId: "q-optional-yesno", value: true },
    ]);
  });
});
