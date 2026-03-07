/**
 * Structured JSON logger for the Colyseus server.
 *
 * Outputs newline-delimited JSON to stdout/stderr.
 * Each log entry includes: level, msg, service, timestamp, and optional fields.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

interface LogEntry {
  level: LogLevel;
  msg: string;
  service: string;
  ts: string;
  [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function emit(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    msg,
    service: 'colyseus-server',
    ts: new Date().toISOString(),
    ...fields,
  };

  const out = level === 'error' ? process.stderr : process.stdout;
  out.write(JSON.stringify(entry) + '\n');
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};
