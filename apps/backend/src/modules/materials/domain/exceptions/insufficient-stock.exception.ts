import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InsufficientStockException extends DomainException {
  readonly code = "INSUFFICIENT_STOCK";

  constructor(materialId: string, available: string, requested: string) {
    super("Insufficient stock for the requested material", {
      materialId,
      available,
      requested,
    });
  }
}

