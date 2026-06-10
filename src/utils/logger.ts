export type LogLevel = "debug" | "info" | "warn" | "error";

type LogSink = (line: string) => void;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export type LogContext = Record<string, unknown>;

export interface LoggerOptions {
  level: LogLevel;
  sink?: LogSink;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const SENSITIVE_KEY_PATTERN =
  /token|secret|api[_-]?key|authorization|access-token|password|phone|address|email/i;

export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? ((line: string) => console.log(line));

  function write(level: LogLevel, message: string, context: LogContext | undefined): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[options.level]) {
      return;
    }

    const payload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context === undefined ? {} : { context: redactSensitive(context) })
    };

    sink(JSON.stringify(payload));
  }

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context)
  };
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value !== null && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactSensitive(nestedValue);
    }
    return redacted;
  }

  return value;
}
