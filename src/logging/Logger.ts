import { getLoggerConfig } from './config/LoggerConfig';
import { getCurrentTraceContext } from './context/AsyncContextManager';
import type { ILogger, LogMessage, LoggerOptions } from './interfaces/ILogger';
import type { ILoggerEngine, LogEntry } from './interfaces/ILoggerEngine';
import type { LogMetadata } from './interfaces/LogMetadata';
import { redactMetadata } from './interfaces/LogMetadata';
import { LogLevel, shouldLogLevelOutput } from './LogLevel';

/**
 * Logger - Main implementation of the ILogger interface
 * Delegates to an ILoggerEngine for actual output
 * Automatically includes trace context from AsyncLocalStorage
 * Supports lazy message evaluation for performance
 */
export class Logger implements ILogger {
  private readonly context: string;
  private readonly engine: ILoggerEngine;
  private readonly options: Required<LoggerOptions>;
  private readonly parentMetadata?: LogMetadata;

  constructor(
    context: string,
    options: LoggerOptions = {},
    engine?: ILoggerEngine,
    parentMetadata?: LogMetadata
  ) {
    this.context = context;
    this.parentMetadata = parentMetadata;

    // Merge options with defaults
    this.options = {
      timestamp: options.timestamp ?? true,
      json: options.json ?? this.detectJsonMode(),
      metadata: options.metadata ?? {},
    };

    // Use provided engine or get from factory
    if (engine) {
      this.engine = engine;
    } else {
      // Lazy import to avoid circular dependencies
      const { LoggerFactory } = require('./LoggerFactory');
      this.engine = LoggerFactory.createEngine();
    }
  }

  public trace(message: LogMessage, metadata?: LogMetadata): void {
    this.log(LogLevel.TRACE, message, undefined, metadata);
  }

  public debug(message: LogMessage, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, undefined, metadata);
  }

  public info(message: LogMessage, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, undefined, metadata);
  }

  public warn(message: LogMessage, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, undefined, metadata);
  }

  public error(
    message: LogMessage,
    error?: Error,
    metadata?: LogMetadata
  ): void {
    this.log(LogLevel.ERROR, message, error, metadata);
  }

  public fatal(
    message: LogMessage,
    error?: Error,
    metadata?: LogMetadata
  ): void {
    this.log(LogLevel.FATAL, message, error, metadata);
  }

  public child(metadata: LogMetadata): ILogger {
    const mergedMetadata = this.mergeMetadata(this.parentMetadata, metadata);
    return new Logger(
      this.context,
      this.options,
      this.engine,
      mergedMetadata
    );
  }

  /**
   * Internal log method that handles all log levels
   */
  private log(
    level: LogLevel,
    message: LogMessage,
    error?: Error,
    metadata?: LogMetadata
  ): void {
    // Check if level is enabled before evaluating message
    if (!shouldLogLevelOutput(level, this.engine.getLevel())) {
      return;
    }

    // Evaluate lazy message
    const messageStr = typeof message === 'function' ? message() : message;

    // Get current trace context (fails silently if none exists)
    const traceContext = getCurrentTraceContext();

    // Merge metadata
    const mergedMetadata = this.mergeMetadata(
      this.parentMetadata,
      this.options.metadata,
      metadata
    );

    // Redact sensitive fields
    const config = getLoggerConfig();
    const redactedMetadata = config.redactSensitive
      ? (redactMetadata(mergedMetadata, {
          fields: config.redactFields,
          mask: config.redactMask,
        }) as LogMetadata | undefined)
      : mergedMetadata;

    // Build log entry
    const entry: LogEntry = {
      level,
      message: messageStr,
      context: this.context,
      timestamp: new Date(),
      traceId: traceContext?.traceId,
      spanId: traceContext?.spanId,
      correlationId: traceContext?.correlationId,
      error,
      metadata: redactedMetadata,
    };

    // Delegate to engine
    this.engine.log(entry);
  }

  /**
   * Merge multiple metadata objects
   * Later objects override earlier ones
   */
  private mergeMetadata(
    ...metadataArray: (LogMetadata | undefined)[]
  ): LogMetadata | undefined {
    const filtered = metadataArray.filter(
      (m): m is LogMetadata => m !== undefined && Object.keys(m).length > 0
    );

    if (filtered.length === 0) {
      return undefined;
    }

    if (filtered.length === 1) {
      return filtered[0];
    }

    return filtered.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  /**
   * Detect if JSON mode should be used based on environment
   */
  private detectJsonMode(): boolean {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'production' || nodeEnv === 'staging';
  }
}
