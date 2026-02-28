import { LogLevel } from '@logging/LogLevel';
import { z } from 'zod';
import { BaseConfig } from './core/base.config';

/**
 * Logging configuration schema
 */
const loggingConfigSchema = z.object({
  /** Minimum log level */
  level: z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'SILENT']).default('INFO'),
  /** Output logs in JSON format */
  json: z.coerce.boolean().default(false),
  /** Include timestamp in logs */
  timestamp: z.coerce.boolean().default(true),
  /** Enable pretty printing */
  prettyPrint: z.coerce.boolean().default(true),
  /** Log engine type */
  engine: z.enum(['console-pretty', 'json-console', 'pino', 'winston']).default('console-pretty'),
  /** Redact sensitive fields */
  redactSensitive: z.coerce.boolean().default(true),
  /** Mask string for redacted values */
  redactMask: z.string().default('[REDACTED]'),
  /** Fields to redact */
  redactFields: z.string().default('password,token,secret,apiKey,authorization'),
  /** Enable file logging (auto-enabled in production if not specified) */
  enableFileLogging: z.coerce.boolean().optional(),
  /** Log retention period in days (default: 7) */
  logRetentionDays: z.coerce.number().int().min(1).max(365).default(7),
  /** Maximum log file size in MB (for future size-based rotation) */
  maxLogSizeMB: z.coerce.number().int().min(1).max(1000).default(100),
  /** Custom log directory (default: ~/.neura/logs) */
  logDirectory: z.string().optional(),
});

/**
 * Type derived from schema
 */
export type LoggingConfigType = z.infer<typeof loggingConfigSchema>;

/**
 * LoggingConfig - Logging-related configuration
 *
 * Encapsulates all logging configuration with validation:
 * - Log levels
 * - Output formats
 * - Security settings (redaction)
 * - Engine selection
 */
export class LoggingConfig extends BaseConfig<LoggingConfigType> {
  protected getSchema(): import('zod').ZodSchema<LoggingConfigType> {
    return loggingConfigSchema;
  }
  protected getEnvPrefix(): string {
    return 'LOG';
  }

  /**
   * Get the log level as enum
   */
  public get logLevel(): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      TRACE: LogLevel.TRACE,
      DEBUG: LogLevel.DEBUG,
      INFO: LogLevel.INFO,
      WARN: LogLevel.WARN,
      ERROR: LogLevel.ERROR,
      FATAL: LogLevel.FATAL,
      SILENT: LogLevel.SILENT,
    };
    return levelMap[this.config.level];
  }

  /**
   * Get the raw log level string
   */
  public get level(): string {
    return this.config.level;
  }

  /**
   * Check if JSON output is enabled
   */
  public get json(): boolean {
    return this.config.json;
  }

  /**
   * Check if timestamps are enabled
   */
  public get timestamp(): boolean {
    return this.config.timestamp;
  }

  /**
   * Check if pretty printing is enabled
   */
  public get prettyPrint(): boolean {
    return this.config.prettyPrint;
  }

  /**
   * Get the log engine type
   */
  public get engine(): string {
    return this.config.engine;
  }

  /**
   * Check if sensitive field redaction is enabled
   */
  public get redactSensitive(): boolean {
    return this.config.redactSensitive;
  }

  /**
   * Get the redaction mask string
   */
  public get redactMask(): string {
    return this.config.redactMask;
  }

  /**
   * Get the list of fields to redact
   */
  public get redactFields(): string[] {
    return this.config.redactFields.split(',').map((f) => f.trim());
  }

  /**
   * Detect if JSON mode should be used based on environment
   */
  public get shouldUseJson(): boolean {
    if (this.config.json) return true;
    return this.config.engine === 'json-console';
  }

  /**
   * Check if file logging is enabled
   * Auto-enabled in production if not explicitly disabled
   */
  public get isFileLoggingEnabled(): boolean {
    // If explicitly set, use that value
    if (this.config.enableFileLogging !== undefined) {
      return this.config.enableFileLogging;
    }

    // Auto-enable in production
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'production';
  }

  /**
   * Get the log retention period in days
   */
  public get logRetentionDays(): number {
    return this.config.logRetentionDays;
  }

  /**
   * Get the maximum log file size in MB
   */
  public get maxLogSizeMB(): number {
    return this.config.maxLogSizeMB;
  }

  /**
   * Get the custom log directory path
   */
  public get logDirectory(): string | undefined {
    return this.config.logDirectory;
  }
}
