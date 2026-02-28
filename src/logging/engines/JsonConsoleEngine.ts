import type { ILoggerEngine, LogEntry } from '../interfaces/ILoggerEngine';
import { LogLevel, LogLevelNames, shouldLogLevelOutput } from '../LogLevel';

/**
 * JsonConsoleEngine - Structured JSON output for production
 * Produces machine-readable logs suitable for log aggregation systems
 */
export class JsonConsoleEngine implements ILoggerEngine {
  private level: LogLevel;
  private readonly includeTimestamp: boolean;
  private readonly output: NodeJS.WriteStream;
  private readonly appName: string;
  private readonly appVersion?: string;
  private readonly environment: string;

  constructor(
    level: LogLevel = LogLevel.INFO,
    includeTimestamp: boolean = true,
    output: NodeJS.WriteStream = process.stdout,
    appName: string = 'app',
    appVersion?: string,
    environment: string = 'production'
  ) {
    this.level = level;
    this.includeTimestamp = includeTimestamp;
    this.output = output;
    this.appName = appName;
    this.appVersion = appVersion;
    this.environment = environment;
  }

  public log(entry: LogEntry): void {
    if (!shouldLogLevelOutput(entry.level, this.level)) {
      return;
    }

    const jsonOutput = this.formatEntry(entry);
    this.output.write(jsonOutput + '\n');
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Format a log entry as JSON
   */
  private formatEntry(entry: LogEntry): string {
    const logObject: Record<string, unknown> = {
      level: LogLevelNames[entry.level].toLowerCase(),
      message: entry.message,
      context: entry.context,
    };

    // Add timestamp
    if (this.includeTimestamp) {
      logObject.timestamp = entry.timestamp.toISOString();
    }

    // Add application metadata
    logObject.service = this.appName;
    logObject.environment = this.environment;

    if (this.appVersion) {
      logObject.version = this.appVersion;
    }

    // Add trace context
    if (entry.traceId) {
      logObject.traceId = entry.traceId;
    }

    if (entry.spanId) {
      logObject.spanId = entry.spanId;
    }

    if (entry.correlationId) {
      logObject.correlationId = entry.correlationId;
    }

    // Add metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logObject.metadata = this.serializeMetadata(entry.metadata);
    }

    // Add error information
    if (entry.error) {
      logObject.error = this.serializeError(entry.error);
    }

    // Safe JSON stringify with circular reference handling
    return this.safeStringify(logObject);
  }

  /**
   * Serialize metadata for JSON output
   */
  private serializeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      result[key] = this.serializeValue(value);
    }

    return result;
  }

  /**
   * Serialize a value for JSON output
   */
  private serializeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Error) {
      return this.serializeError(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.serializeValue(v));
    }

    if (typeof value === 'object') {
      return this.serializeMetadata(value as Record<string, unknown>);
    }

    return value;
  }

  /**
   * Serialize an error to a plain object
   */
  private serializeError(error: Error): Record<string, unknown> {
    const result: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      result.stack = error.stack.split('\n');
    }

    // Include additional error properties
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        result[key] = this.serializeValue(value);
      }
    }

    return result;
  }

  /**
   * Safely stringify an object, handling circular references
   */
  private safeStringify(obj: Record<string, unknown>): string {
    const seen = new WeakSet<object>();

    return JSON.stringify(obj, (_key, value: unknown) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }

      // Handle BigInt
      if (typeof value === 'bigint') {
        return value.toString();
      }

      // Handle functions
      if (typeof value === 'function') {
        return '[Function]';
      }

      // Handle symbols
      if (typeof value === 'symbol') {
        return value.toString();
      }

      return value;
    });
  }
}
