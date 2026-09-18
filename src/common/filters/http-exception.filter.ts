import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
}

interface HttpExceptionBody {
  code?: string;
  message?: string | string[];
  details?: unknown[];
}

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_REQUIRED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

const SCREAMING_SNAKE = /^[A-Z][A-Z0-9_]*$/;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = this.extractHttpBody(exception);

      const payload: ErrorBody = {
        error: {
          code: body.code,
          message: body.message,
          details: body.details,
          requestId,
        },
      };

      res.status(status).json(payload);
      return;
    }

    this.logger.error(
      `Unhandled exception on ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const payload: ErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: [],
        requestId,
      },
    };

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private extractHttpBody(exception: HttpException): {
    code: string;
    message: string;
    details: unknown[];
  } {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        code: this.deriveCode(response, exception.getStatus()),
        message: response,
        details: [],
      };
    }

    const body = response as HttpExceptionBody & { statusCode?: number };

    const rawMessage = body.message;
    if (Array.isArray(rawMessage) && rawMessage.length > 0) {
      return {
        code: typeof body.code === 'string' ? body.code : 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: rawMessage.map((m) => ({ issue: m })),
      };
    }

    const message =
      typeof rawMessage === 'string' ? rawMessage : 'Request failed';
    const code =
      typeof body.code === 'string'
        ? body.code
        : this.deriveCode(message, exception.getStatus());
    const details = Array.isArray(body.details) ? body.details : [];

    return { code, message, details };
  }

  private deriveCode(message: string, status: number): string {
    if (SCREAMING_SNAKE.test(message)) {
      return message;
    }
    return STATUS_CODES[status] ?? 'INTERNAL_ERROR';
  }
}
