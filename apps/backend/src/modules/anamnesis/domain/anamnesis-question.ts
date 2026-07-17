export const QUESTION_TYPES = ["text", "yes_no"] as const;

export type AnamnesisQuestionType = (typeof QUESTION_TYPES)[number];

export interface AnamnesisQuestion {
  id: string;
  type: AnamnesisQuestionType;
  label: string;
  required: boolean;
}
