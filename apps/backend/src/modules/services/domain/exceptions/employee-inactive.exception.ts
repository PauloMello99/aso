import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EmployeeInactiveException extends DomainException {
  readonly code = "EMPLOYEE_INACTIVE";

  constructor(id: string) {
    super(`Employee is not an active member: ${id}`);
  }
}
