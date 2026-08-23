import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorDetails = {
  name?: string;
  message?: string;
  stack?: string[];
  cause?: unknown;
  extra?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function serializeExtra(exception: unknown) {
  if (!isRecord(exception)) return undefined;
  const extra: Record<string, unknown> = {};
  for (const key of ['code', 'meta', 'clientVersion', 'errno', 'sqlState', 'sqlMessage']) {
    if (key in exception) extra[key] = exception[key];
  }
  return Object.keys(extra).length > 0 ? extra : undefined;
}

function normalizeResponseMessage(response: string | object) {
  if (typeof response === 'string') return response;
  if (!isRecord(response)) return 'Request failed';
  const message = response.message;
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string') return message;
  return 'Request failed';
}

function buildDetails(exception: unknown): ErrorDetails {
  if (exception instanceof Error) {
    return {
      name: exception.name,
      message: exception.message,
      stack: exception.stack?.split('\n').map((line) => line.trim()),
      cause: exception.cause,
      extra: serializeExtra(exception),
    };
  }

  return {
    message: typeof exception === 'string' ? exception : JSON.stringify(exception),
    extra: serializeExtra(exception),
  };
}

@Catch()
export class DetailedExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const message = isHttpException
      ? normalizeResponseMessage(exceptionResponse ?? 'Request failed')
      : exception instanceof Error
        ? exception.message || 'Internal server error'
        : 'Internal server error';

    if (!isHttpException || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error:
        isHttpException && isRecord(exceptionResponse) && typeof exceptionResponse.error === 'string'
          ? exceptionResponse.error
          : exception instanceof Error
            ? exception.name
            : 'Error',
      method: request.method,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      details: buildDetails(exception),
    });
  }
}
