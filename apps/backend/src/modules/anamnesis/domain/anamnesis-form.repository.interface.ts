import type { AnamnesisQuestion } from "./anamnesis-question";
import type { AnamnesisFormVersionEntity } from "./anamnesis-form-version.entity";

export const ANAMNESIS_FORM_REPOSITORY = Symbol("ANAMNESIS_FORM_REPOSITORY");

export interface CreateAnamnesisFormVersionData {
  orgId: string;
  serviceTypeId: string;
  questions: AnamnesisQuestion[];
  createdBy: string | null;
}

/**
 * Versões são imutáveis por design (nenhum método de update/delete é exposto
 * de propósito) — ver `.memory/domain-rules.md` (M10a).
 */
export interface IAnamnesisFormRepository {
  getCurrentVersion(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity | null>;
  /** Ordem decrescente por `versionNumber` (mais recente primeiro). */
  listVersions(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity[]>;
  /** Get-or-create o form + insere a próxima versão. Transacional. */
  createVersion(
    data: CreateAnamnesisFormVersionData,
  ): Promise<AnamnesisFormVersionEntity>;
}
