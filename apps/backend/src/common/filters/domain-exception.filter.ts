import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { DomainException } from "../exceptions/domain.exception";

const CODE_TO_STATUS: Record<string, number> = {
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  AUTH_TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
  ORGANIZATION_NOT_FOUND: HttpStatus.NOT_FOUND,
  SLUG_ALREADY_TAKEN: HttpStatus.CONFLICT,
  ORG_FORBIDDEN: HttpStatus.FORBIDDEN,
  MEMBER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVITATION_NOT_FOUND: HttpStatus.NOT_FOUND,
  INVITATION_NOT_PENDING: HttpStatus.CONFLICT,
  INVITATION_EXPIRED: HttpStatus.UNPROCESSABLE_ENTITY,
  INVITATION_EMAIL_MISMATCH: HttpStatus.FORBIDDEN,
  MATERIAL_NOT_FOUND: HttpStatus.NOT_FOUND,
  MATERIAL_IN_USE_BY_SERVICES: HttpStatus.CONFLICT,
  INSUFFICIENT_STOCK: HttpStatus.UNPROCESSABLE_ENTITY,
  CUSTOMER_NOT_FOUND: HttpStatus.NOT_FOUND,
  CALENDAR_EVENT_NOT_FOUND: HttpStatus.NOT_FOUND,
  CALENDAR_EVENT_OVERLAP: HttpStatus.CONFLICT,
  CALENDAR_EVENT_FORBIDDEN: HttpStatus.FORBIDDEN,
  CALENDAR_EVENT_INVALID_RANGE: HttpStatus.UNPROCESSABLE_ENTITY,
  TRANSACTION_NOT_FOUND: HttpStatus.NOT_FOUND,
  TRANSACTION_ALREADY_REVERSED: HttpStatus.CONFLICT,
  TRANSACTION_NOT_REVERSIBLE: HttpStatus.UNPROCESSABLE_ENTITY,
  CASHIER_FORBIDDEN: HttpStatus.FORBIDDEN,
  AVATAR_UPLOAD_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  LAST_ACTIVE_OWNER: HttpStatus.CONFLICT,
  SERVICE_NOT_FOUND: HttpStatus.NOT_FOUND,
  CUSTOMER_DISABLED: HttpStatus.UNPROCESSABLE_ENTITY,
  EMPLOYEE_INACTIVE: HttpStatus.UNPROCESSABLE_ENTITY,
  SERVICE_ALREADY_CANCELED: HttpStatus.CONFLICT,
  SERVICE_NOT_PAYABLE: HttpStatus.CONFLICT,
  SERVICE_FORBIDDEN: HttpStatus.FORBIDDEN,
  PLATFORM_TARGET_NOT_FOUND: HttpStatus.NOT_FOUND,
  CANNOT_CHANGE_OWN_PLATFORM_ROLE: HttpStatus.CONFLICT,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = CODE_TO_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
