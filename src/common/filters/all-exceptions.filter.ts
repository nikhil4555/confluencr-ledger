import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;

        // class-validator returns message as string[]
        if (Array.isArray(resp.message)) {
          message = (resp.message as string[]).join('; ');
        } else {
          message = (resp.message as string) ?? exception.message;
        }

        // Carry over any extra structured info set on the exception
        if (resp.details) {
          details = resp.details as Record<string, unknown>;
        }
      }
    } else {
      this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, exception);
    }

    const body: Record<string, unknown> = {
      status: 'failure',
      statusCode,
      message,
    };

    if (details) {
      body.details = details;
    }

    response.status(statusCode).json(body);
  }
}
