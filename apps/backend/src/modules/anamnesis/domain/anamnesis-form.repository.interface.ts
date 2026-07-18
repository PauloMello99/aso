import type { AnamnesisQuestion } from "./anamnesis-question";
import type { AnamnesisFormVersionEntity } from "./anamnesis-form-version.entity";

export const ANAMNESIS_FORM_REPOSITORY = Symbol("ANAMNESIS_FORM_REPOSITORY");

export interface CreateAnamnesisFormVersionData {
  orgId: string;
  serviceTypeId: string;
  questions: AnamnesisQuestion[];
  createdBy: string | null;
}

export interface IAnamnesisFormRepository {
  getCurrentVersion(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity | null>;
  listVersions(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity[]>;
  createVersion(
    data: CreateAnamnesisFormVersionData,
  ): Promise<AnamnesisFormVersionEntity>;
}
