import { ZodError } from 'zod';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export function validationError(err: ZodError): ApiErrorShape {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: err.issues.map(i => ({ path: i.path, message: i.message }))
  };
}

export function notFound(message = 'Resource not found'): ApiErrorShape {
  return { code: 'NOT_FOUND', message };
}

export function unauthorized(message = 'Unauthorized'): ApiErrorShape {
  return { code: 'UNAUTHORIZED', message };
}

export function forbidden(message = 'Forbidden'): ApiErrorShape {
  return { code: 'FORBIDDEN', message };
}

export function internal(message = 'Internal server error'): ApiErrorShape {
  return { code: 'INTERNAL', message };
}

export function conflict(message = 'Conflict'): ApiErrorShape {
  return { code: 'CONFLICT', message };
}

export function badRequest(message = 'Bad request', details?: unknown): ApiErrorShape {
  return { code: 'BAD_REQUEST', message, details };
}

// Map known Prisma error codes (P2002 unique constraint, etc.)
export function mapPrismaError(e: unknown): ApiErrorShape {
  const err = e as { code?: string; meta?: Record<string, unknown> } | null;
  switch (err?.code) {
    case 'P2002':
      return conflict('Unique constraint violation');
    case 'P2025':
      // An operation failed because it depends on one or more records that were required but not found
      return notFound('Record not found');
    case 'P2003':
      // Foreign key constraint failed
      return badRequest('Foreign key constraint failed', err?.meta);
    case 'P2001':
      // The record searched for in the where condition does not exist
      return notFound('Record not found');
    default:
      return internal();
  }
}

// Type guard to detect our normalized API error
export function isApiErrorShape(e: unknown): e is ApiErrorShape {
  return !!e && typeof e === 'object' && 'code' in e && 'message' in e;
}

// Translate normalized error code to HTTP status
export function httpStatusForError(err: ApiErrorShape): number {
  switch (err.code) {
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMIT':
    case 'RATE_LIMITED':
      return 429;
    default:
      return 500;
  }
}
