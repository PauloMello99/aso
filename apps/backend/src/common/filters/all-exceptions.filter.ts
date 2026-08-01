import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainException } from "../exceptions/domain.exception";
import { DOMAIN_CODE_TO_STATUS } from "../exceptions/domain-status.map";
import { TelemetryService } from "../telemetry/telemetry.service";

interface AuthedRequest extends Request {
  user?: { id?: string; authId?: string; sub?: string };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly telemetry: TelemetryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthedRequest>();
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainException) {
      const status =
        DOMAIN_CODE_TO_STATUS[exception.code] ??
        HttpStatus.INTERNAL_SERVER_ERROR;

      response.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
        path: request.url,
        timestamp,
        ...(exception.details && { details: exception.details }),
      });

      this.maybeReport(status, exception, request, exception.code);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      response.status(status).json({
        statusCode: status,
        timestamp,
        path: request.url,
        message: exception.message,
      });

      this.maybeReport(status, exception, request);
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json({
      statusCode: status,
      timestamp,
      path: request.url,
      message: "Internal server error",
    });

    this.maybeReport(status, exception, request);
  }

  private maybeReport(
    status: number,
    exception: unknown,
    request: AuthedRequest,
    code?: string,
  ): void {
    const module = this.moduleFromPath(request.url);

    if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.debug(
        `[${module}] ${status} ${request.method} ${request.url}${
          code ? ` (${code})` : ""
        }`,
      );
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);
    this.logger.error(
      `[${module}] ${status} ${request.method} ${request.url}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    this.telemetry.captureException(exception, {
      module,
      code: code ?? null,
      statusCode: status,
      path: request.url,
      method: request.method,
      userId: request.user?.id ?? request.user?.sub ?? null,
    });
  }

  private moduleFromPath(url: string): string {
    const segment = url.split("?")[0]?.split("/").filter(Boolean)[0];
    return segment ?? "root";
  }
}
