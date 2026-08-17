import { DomainException } from "../../../../common/exceptions/domain.exception";

export class PlanIntervalNotEnabledException extends DomainException {
  readonly code = "PLAN_INTERVAL_NOT_ENABLED";

  constructor(planKey: string, interval: string) {
    super(
      `Intervalo '${interval}' não está habilitado para o plano '${planKey}'`,
    );
  }
}
