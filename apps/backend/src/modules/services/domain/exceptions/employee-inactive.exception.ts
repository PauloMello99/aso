import { DomainException } from "../../../../common/exceptions/domain.exception";

/** Profissional não é membro ativo da org (não pode executar serviços). */
export class EmployeeInactiveException extends DomainException {
  readonly code = "EMPLOYEE_INACTIVE";

  constructor(id: string) {
    super(`Employee is not an active member: ${id}`);
  }
}
