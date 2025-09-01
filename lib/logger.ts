import pino, { LoggerOptions } from 'pino';

// Redaction patterns (avoid logging secrets / PII)
const redaction = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'user.passwordHash'
  ],
  censor: '[REDACTED]'
};

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const baseOptions: LoggerOptions = {
  level,
  redact: redaction,
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', singleLine: true }
  } : undefined,
  base: { app: 'trading-journal' }
};

// Singleton (avoid recreating during hot reload)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _logger: any = (global as unknown as { __APP_LOGGER?: ReturnType<typeof pino> }).__APP_LOGGER;
if (!_logger) {
  _logger = pino(baseOptions);
  (global as unknown as { __APP_LOGGER?: ReturnType<typeof pino> }).__APP_LOGGER = _logger;
}

export const logger = _logger as ReturnType<typeof pino>;

export interface LogContext {
  reqId?: string;
  userId?: string;
  route?: string;
}

export function withContext(ctx: LogContext) {
  return logger.child(ctx);
}
