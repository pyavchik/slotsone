type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: String(error) };
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };

  if ('err' in payload) {
    payload.err = serializeError(payload.err);
  }

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(message: string, context?: LogContext): void {
    writeLog('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    writeLog('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    writeLog('error', message, context);
  },
};
