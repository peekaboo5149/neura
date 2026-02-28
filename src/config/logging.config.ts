import { LogLevel } from '@logging/LogLevel';
import { z } from 'zod';
import { BaseConfig } from './core/base.config';

/**
 * Logging configuration schema
 */
const loggingConfigSchema = z.object({
  /** Minimum log level */
  level: z
    .enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'SILENT'])
    .default('INFO'),
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
  protected getSchema() {
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
}
