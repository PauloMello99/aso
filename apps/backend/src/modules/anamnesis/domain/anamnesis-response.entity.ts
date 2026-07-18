import type { AnamnesisQuestion } from "./anamnesis-question";

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

  get isExpired(): boolean {
    return this.status === "pending" && this.expiresAt < new Date();
  }

  get displayStatus(): AnamnesisResponseStatus | "expired" {
    return this.isExpired ? "expired" : this.status;
  }

  static create(props: AnamnesisResponseEntityProps): AnamnesisResponseEntity {
    return new AnamnesisResponseEntity(props);
  }
}
