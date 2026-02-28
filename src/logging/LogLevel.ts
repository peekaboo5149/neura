/**
 * LogLevel - Enumeration of all supported logging levels
 * Ordered by severity (lowest to highest)
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6, // Special level to disable all logging
}

/**
 * String representations of log levels for display and parsing
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * Parse a string into a LogLevel enum value
 * Case-insensitive, defaults to INFO for invalid values
 */
export function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) {
    return LogLevel.INFO;
  }

  const normalized = level.toUpperCase().trim();

  switch (normalized) {
    case 'TRACE':
      return LogLevel.TRACE;
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'FATAL':
      return LogLevel.FATAL;
    case 'SILENT':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Check if a log level should be output based on the configured minimum level
 */
export function shouldLogLevelOutput(messageLevel: LogLevel, minimumLevel: LogLevel): boolean {
  return messageLevel >= minimumLevel && messageLevel < LogLevel.SILENT;
}
