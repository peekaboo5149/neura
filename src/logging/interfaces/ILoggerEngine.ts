import type { LogLevel } from '../LogLevel';
import type { LogMetadata } from './LogMetadata';

/**
 * LogEntry - A structured log entry containing all information for output
 * This is the internal data structure passed between Logger and ILoggerEngine
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context: string;
  readonly timestamp: Date;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly correlationId?: string;
  readonly error?: Error;
  readonly metadata?: LogMetadata;
}

/**
 * ILoggerEngine - Abstract interface for logging backends
 * All logging engines must implement this interface
 * This abstraction allows swapping logging libraries without changing consumer code
 */
export interface ILoggerEngine {
  /**
   * Output a log entry
   * @param entry - The structured log entry to output
   */
  log(entry: LogEntry): void;

  /**
   * Set the minimum log level for this engine
   * @param level - The minimum level to output
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current minimum log level
   */
  getLevel(): LogLevel;

  /**
   * Dispose of any resources held by the engine
   * Optional for engines that need cleanup
   */
  dispose?(): void;
}

/**
 * Engine factory type for creating engine instances
 */
export type LoggerEngineFactory = () => ILoggerEngine;
