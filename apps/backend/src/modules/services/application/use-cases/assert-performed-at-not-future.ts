import { ServicePerformedAtFutureException } from "../../domain/exceptions/service-performed-at-future.exception";

export function assertPerformedAtNotFuture(performedAt?: Date): void {
  if (!performedAt) return;
  if (performedAt.getTime() > Date.now()) {
    throw new ServicePerformedAtFutureException();
  }
}
