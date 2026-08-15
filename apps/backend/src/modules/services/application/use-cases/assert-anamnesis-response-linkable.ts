import type { IAnamnesisResponseRepository } from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import type { IAnamnesisFormRepository } from "../../../anamnesis/domain/anamnesis-form.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseNotLinkableException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-linkable.exception";
import { AnamnesisResponseOutdatedException } from "../../../anamnesis/domain/exceptions/anamnesis-response-outdated.exception";

export async function assertAnamnesisResponseLinkable(
  anamnesisResponseRepo: IAnamnesisResponseRepository,
  orgId: string,
  anamnesisResponseId: string,
  effectiveCustomerId: string | null,
  effectiveServiceTypeId: string | null,
  formRepo: IAnamnesisFormRepository,
  skipVersionCheck: boolean = false,
): Promise<void> {
  const response = await anamnesisResponseRepo.findById(
    anamnesisResponseId,
    orgId,
  );
  if (!response) {
    throw new AnamnesisResponseNotFoundException(anamnesisResponseId);
  }

  if (response.displayStatus !== "submitted") {
    throw new AnamnesisResponseNotLinkableException(anamnesisResponseId);
  }

  if (response.customerId !== effectiveCustomerId) {
    throw new AnamnesisResponseNotLinkableException(anamnesisResponseId);
  }

  if (response.serviceTypeId !== effectiveServiceTypeId) {
    throw new AnamnesisResponseNotLinkableException(anamnesisResponseId);
  }

  if (!skipVersionCheck && effectiveServiceTypeId) {
    const current = await formRepo.getCurrentVersion(
      effectiveServiceTypeId,
      orgId,
    );
    if (
      current &&
      response.formVersionId &&
      response.formVersionId !== current.id
    ) {
      throw new AnamnesisResponseOutdatedException(anamnesisResponseId);
    }
  }
}
