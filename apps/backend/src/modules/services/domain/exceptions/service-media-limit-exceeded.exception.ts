import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ServiceMediaLimitExceededException extends DomainException {
  readonly code = "SERVICE_MEDIA_LIMIT_EXCEEDED";

  constructor(serviceId: string) {
    super(`Service ${serviceId} already has the maximum of 3 media files`);
  }
}
