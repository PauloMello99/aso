import type { AnamnesisQuestion } from "./anamnesis-question";

/** Resposta a uma pergunta — o `value` casa com o `type` da pergunta (`yes_no` → boolean, `text` → string). */
export type AnamnesisAnswer = {
  questionId: string;
  value: string | boolean;
};

export type AnamnesisResponseStatus = "pending" | "submitted";

export interface AnamnesisResponseEntityProps {
  id: string;
  orgId: string;
  formVersionId: string | null;
  serviceTypeId: string | null;
  customerId: string | null;
  questionsSnapshot: AnamnesisQuestion[];
  token: string;
  expiresAt: Date;
  status: AnamnesisResponseStatus;
  answers: AnamnesisAnswer[] | null;
  submittedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export class AnamnesisResponseEntity {
  readonly id: string;
  readonly orgId: string;
  readonly formVersionId: string | null;
  readonly serviceTypeId: string | null;
  readonly customerId: string | null;
  readonly questionsSnapshot: AnamnesisQuestion[];
  readonly token: string;
  readonly expiresAt: Date;
  readonly status: AnamnesisResponseStatus;
  readonly answers: AnamnesisAnswer[] | null;
  readonly submittedAt: Date | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: AnamnesisResponseEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.formVersionId = props.formVersionId;
    this.serviceTypeId = props.serviceTypeId;
    this.customerId = props.customerId;
    this.questionsSnapshot = props.questionsSnapshot;
    this.token = props.token;
    this.expiresAt = props.expiresAt;
    this.status = props.status;
    this.answers = props.answers;
    this.submittedAt = props.submittedAt;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  /** Ainda pendente e a data de expiração já passou. */
  get isExpired(): boolean {
    return this.status === "pending" && this.expiresAt < new Date();
  }

  /** "expired" é derivado em runtime — nunca persistido (só 2 valores no enum do banco). */
  get displayStatus(): AnamnesisResponseStatus | "expired" {
    return this.isExpired ? "expired" : this.status;
  }

  static create(props: AnamnesisResponseEntityProps): AnamnesisResponseEntity {
    return new AnamnesisResponseEntity(props);
  }
}
