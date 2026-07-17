import type { IAnamnesisResponseRepository } from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseNotLinkableException } from "../../../anamnesis/domain/exceptions/anamnesis-response-not-linkable.exception";

/**
 * Valida que a resposta de anamnese informada pode ser vinculada ao serviço
 * (M10b): existe na org, está `submitted` e — quando a resposta já tiver
 * tipo/cliente preenchidos — eles batem com os efetivos do serviço. Violação
 * do índice único parcial (resposta já vinculada a outro serviço) é pega no
 * insert/update do repositório, não aqui.
 */
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
