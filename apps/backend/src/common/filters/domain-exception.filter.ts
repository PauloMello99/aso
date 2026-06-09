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
  MATERIAL_NOT_FOUND: HttpStatus.NOT_FOUND,
  INSUFFICIENT_STOCK: HttpStatus.UNPROCESSABLE_ENTITY,
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
