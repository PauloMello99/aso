import type { AnamnesisQuestion } from "./anamnesis-question";

export interface AnamnesisFormVersionProps {
  id: string;
  formId: string;
  orgId: string;
  versionNumber: number;
  questions: AnamnesisQuestion[];
  createdBy: string | null;
  createdAt: Date;
}

export class AnamnesisFormVersionEntity {
  readonly id: string;
  readonly formId: string;
  readonly orgId: string;
  readonly versionNumber: number;
  readonly questions: AnamnesisQuestion[];
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: AnamnesisFormVersionProps) {
    this.id = props.id;
    this.formId = props.formId;
    this.orgId = props.orgId;
    this.versionNumber = props.versionNumber;
    this.questions = props.questions;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  static create(props: AnamnesisFormVersionProps): AnamnesisFormVersionEntity {
    return new AnamnesisFormVersionEntity(props);
  }
}
