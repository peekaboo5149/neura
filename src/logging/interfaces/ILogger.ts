import type { LogMetadata } from './LogMetadata';

/**
 * LogMessage - Message can be a string or a lazy function that returns a string
 * Lazy evaluation allows expensive message computation to be skipped if log level is disabled
 */
export type LogMessage = string | (() => string);

/**
 * ILogger - Primary interface for logging operations
 * This is the interface consumed by application code
 * All implementations must support structured metadata and lazy message evaluation
 */
export interface ILogger {
  /**
   * Log a TRACE level message
   * @param message - The message to log (string or lazy function)
   * @param metadata - Optional structured metadata
   */
  trace(message: LogMessage, metadata?: LogMetadata): void;

  /**
   * Log a DEBUG level message
   * @param message - The message to log (string or lazy function)
   * @param metadata - Optional structured metadata
   */
  debug(message: LogMessage, metadata?: LogMetadata): void;

  /**
   * Log an INFO level message
   * @param message - The message to log (string or lazy function)
   * @param metadata - Optional structured metadata
   */
  info(message: LogMessage, metadata?: LogMetadata): void;

  /**
   * Log a WARN level message
   * @param message - The message to log (string or lazy function)
   * @param metadata - Optional structured metadata
   */
  warn(message: LogMessage, metadata?: LogMetadata): void;

  /**
   * Log an ERROR level message
   * @param message - The message to log (string or lazy function)
   * @param error - Optional Error object to include
   * @param metadata - Optional structured metadata
   */
  error(message: LogMessage, error?: Error, metadata?: LogMetadata): void;

  /**
   * Log a FATAL level message
   * @param message - The message to log (string or lazy function)
   * @param error - Optional Error object to include
   * @param metadata - Optional structured metadata
   */
  fatal(message: LogMessage, error?: Error, metadata?: LogMetadata): void;

  /**
   * Create a child logger with additional context metadata
   * @param metadata - Metadata to merge with all future log entries
   */
  child(metadata: LogMetadata): ILogger;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * Include timestamp in log output
   * @default true
   */
  readonly timestamp?: boolean;

  /**
   * Output logs in JSON format
   * @default based on NODE_ENV (true for production)
   */
  readonly json?: boolean;

  /**
   * Additional context metadata to include with every log
   */
  readonly metadata?: LogMetadata;
}
