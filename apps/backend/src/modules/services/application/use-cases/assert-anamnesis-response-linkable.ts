import type { IAnamnesisResponseRepository } from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseNotLinkableException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-linkable.exception";

export async function assertAnamnesisResponseLinkable(
  anamnesisResponseRepo: IAnamnesisResponseRepository,
  orgId: string,
  anamnesisResponseId: string,
  effectiveCustomerId: string | null,
  effectiveServiceTypeId: string | null,
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

  if (
    response.customerId &&
    response.customerId !== effectiveCustomerId
  ) {
    throw new AnamnesisResponseNotLinkableException(anamnesisResponseId);
  }

  if (
    response.serviceTypeId &&
    response.serviceTypeId !== effectiveServiceTypeId
  ) {
    throw new AnamnesisResponseNotLinkableException(anamnesisResponseId);
  }
}
