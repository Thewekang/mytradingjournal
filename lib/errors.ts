import { ZodError } from 'zod';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: any;
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

export function badRequest(message = 'Bad request', details?: any): ApiErrorShape {
  return { code: 'BAD_REQUEST', message, details };
}

// Map known Prisma error codes (P2002 unique constraint, etc.)
export function mapPrismaError(e: any): ApiErrorShape {
  if (e?.code === 'P2002') {
    return conflict('Unique constraint violation');
  }
  return internal();
}
