import type { WriteStream } from 'fs';
import type { ILoggerEngine, LogEntry } from '../interfaces/ILoggerEngine';
import { LogLevel, LogLevelNames, shouldLogLevelOutput } from '../LogLevel';
import { LogFileService } from '../services/LogFileService';

/**
 * FileRollingEngine - Rolling file logging with daily rotation
 *
 * Features:
 * - Daily file rotation (neura-YYYY-MM-DD.log)
 * - Automatic directory creation
 * - JSON structured output
 * - Configurable retention period
 * - Async write stream for non-blocking I/O
 * - Automatic cleanup of expired logs on initialization
 */
export class FileRollingEngine implements ILoggerEngine {
  private level: LogLevel;
  private readonly includeTimestamp: boolean;
  private readonly logFileService: LogFileService;
  private readonly retentionDays: number;
  private readonly appName: string;
  private readonly appVersion?: string;
  private readonly environment: string;

  private currentStream: WriteStream | null = null;
  private currentDate: Date | null = null;
  private isDisposed = false;

  constructor(
    options: {
      level?: LogLevel;
      includeTimestamp?: boolean;
      logDirectory?: string;
      retentionDays?: number;
      appName?: string;
      appVersion?: string;
      environment?: string;
    } = {}
  ) {
    this.level = options.level ?? LogLevel.INFO;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.retentionDays = options.retentionDays ?? 7;
    this.appName = options.appName ?? 'neura';
    this.appVersion = options.appVersion;
    this.environment = options.environment ?? 'production';

    this.logFileService = new LogFileService(options.logDirectory);
  }

  /**
   * Initialize the engine - must be called before logging
   * Creates directory and cleans up old logs
   */
  public async initialize(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('FileRollingEngine has been disposed');
    }

    await this.logFileService.ensureLogDirectory();

    // Clean up old logs on initialization
    const deletedCount = await this.logFileService.cleanupOldLogs(this.retentionDays);
    if (deletedCount > 0) {
      // We can't log here yet since we're initializing
      // The cleanup result will be visible in the next log file
      // eslint-disable-next-line no-console
      console.info(`Cleaned up ${deletedCount} old log file(s)`);
    }

    await this.rotateStreamIfNeeded();
  }

  public log(entry: LogEntry): void {
    if (this.isDisposed) {
      return;
    }

    if (!shouldLogLevelOutput(entry.level, this.level)) {
      return;
    }

    // Check if we need to rotate (new day)
    void this.rotateStreamIfNeeded().then(() => {
      if (this.currentStream && !this.currentStream.destroyed) {
        const jsonOutput = this.formatEntry(entry);
        this.currentStream.write(jsonOutput + '\n');
      }
    });
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.isDisposed = true;
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }

  /**
   * Get the current log file path
   */
  public getCurrentLogFilePath(): string {
    return this.logFileService.getCurrentLogFilePath();
  }

  /**
   * Check if rotation is needed and rotate if so
   */
  private async rotateStreamIfNeeded(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we need to rotate (first write or new day)
    if (!this.currentDate || !this.isSameDay(this.currentDate, today)) {
      await this.rotateStream(today);
    }
  }

  /**
   * Rotate to a new stream for the given date
   */
  private async rotateStream(date: Date): Promise<void> {
    // Close existing stream
    if (this.currentStream) {
      await new Promise<void>((resolve) => {
        this.currentStream?.end(() => resolve());
      });
    }

    // Create new stream
    const filePath = this.logFileService.getLogFilePath(date);
    this.currentStream = this.logFileService.createWriteStream(filePath);
    this.currentDate = date;

    // Handle stream errors
    this.currentStream.on('error', (error) => {
      console.error(`Log file write error: ${error.message}`);
    });
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
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
