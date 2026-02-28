import { LogLevel, parseLogLevel } from '../LogLevel';

/**
 * Logger configuration options
 */
export interface LoggerConfigOptions {
  /**
   * Minimum log level to output
   * @default LogLevel.INFO
   */
  readonly level: LogLevel;

  /**
   * Output logs in JSON format
   * @default false in development, true in production
   */
  readonly json: boolean;

  /**
   * Include timestamp in log output
   * @default true
   */
  readonly timestamp: boolean;

  /**
   * Application name for structured logging
   * @default 'app'
   */
  readonly appName: string;

  /**
   * Application version for structured logging
   */
  readonly appVersion?: string;

  /**
   * Environment name
   * @default 'development'
   */
  readonly environment: string;

  /**
   * Whether to enable pretty print in development
   * @default true
   */
  readonly prettyPrint: boolean;

  /**
   * Whether to redact sensitive fields
   * @default true
   */
  readonly redactSensitive: boolean;

  /**
   * Fields to redact from logs
   */
  readonly redactFields: readonly string[];

  /**
   * String to use for redacted values
   * @default '[REDACTED]'
   */
  readonly redactMask: string;

  /**
   * Whether to enable file logging
   * @default false in development, true in production
   */
  readonly enableFileLogging?: boolean;

  /**
   * Log retention period in days
   * @default 7
   */
  readonly logRetentionDays?: number;

  /**
   * Maximum log file size in MB (for future size-based rotation)
   * @default 100
   */
  readonly maxLogSizeMB?: number;

  /**
   * Custom log directory path
   * @default ~/.neura/logs
   */
  readonly logDirectory?: string;
}

/**
 * Immutable logger configuration
 */
export class LoggerConfig implements LoggerConfigOptions {
  public readonly level: LogLevel;
  public readonly json: boolean;
  public readonly timestamp: boolean;
  public readonly appName: string;
  public readonly appVersion: string | undefined;
  public readonly environment: string;
  public readonly prettyPrint: boolean;
  public readonly redactSensitive: boolean;
  public readonly redactFields: readonly string[];
  public readonly redactMask: string;
  public readonly enableFileLogging: boolean | undefined;
  public readonly logRetentionDays: number | undefined;
  public readonly maxLogSizeMB: number | undefined;
  public readonly logDirectory: string | undefined;

  private constructor(options: Partial<LoggerConfigOptions> = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.json = options.json ?? this.detectJsonMode();
    this.timestamp = options.timestamp ?? true;
    this.appName = options.appName ?? 'app';
    this.appVersion = options.appVersion;
    this.environment = options.environment ?? this.detectEnvironment();
    this.prettyPrint = options.prettyPrint ?? this.detectPrettyPrint();
    this.redactSensitive = options.redactSensitive ?? true;
    this.redactFields = options.redactFields ?? DEFAULT_REDACT_FIELDS;
    this.redactMask = options.redactMask ?? '[REDACTED]';
    this.enableFileLogging = options.enableFileLogging ?? this.detectFileLogging();
    this.logRetentionDays = options.logRetentionDays ?? 7;
    this.maxLogSizeMB = options.maxLogSizeMB ?? 100;
    this.logDirectory = options.logDirectory;
  }

  /**
   * Create a LoggerConfig from environment variables
   */
  public static fromEnv(): LoggerConfig {
    const options: Partial<LoggerConfigOptions> = {
      level: parseLogLevel(process.env.LOG_LEVEL),
      json: parseBooleanEnv(process.env.LOG_JSON),
      timestamp: parseBooleanEnv(process.env.LOG_TIMESTAMP),
      appName: process.env.APP_NAME || process.env.npm_package_name,
      appVersion: process.env.APP_VERSION || process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      prettyPrint: parseBooleanEnv(process.env.LOG_PRETTY),
      redactSensitive: parseBooleanEnv(process.env.LOG_REDACT_SENSITIVE) ?? true,
      redactMask: process.env.LOG_REDACT_MASK,
      enableFileLogging: parseBooleanEnv(process.env.LOG_ENABLE_FILE),
      logRetentionDays: parseIntEnv(process.env.LOG_RETENTION_DAYS),
      maxLogSizeMB: parseIntEnv(process.env.LOG_MAX_SIZE_MB),
      logDirectory: process.env.LOG_DIRECTORY,
    };

    // Filter out undefined values
    const filteredOptions = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined)
    ) as Partial<LoggerConfigOptions>;

    return new LoggerConfig(filteredOptions);
  }

  /**
   * Create a LoggerConfig with explicit options
   */
  public static create(options: Partial<LoggerConfigOptions> = {}): LoggerConfig {
    return new LoggerConfig(options);
  }

  /**
   * Create a new config with merged options
   */
  public merge(options: Partial<LoggerConfigOptions>): LoggerConfig {
    return new LoggerConfig({
      level: options.level ?? this.level,
      json: options.json ?? this.json,
      timestamp: options.timestamp ?? this.timestamp,
      appName: options.appName ?? this.appName,
      appVersion: options.appVersion ?? this.appVersion,
      environment: options.environment ?? this.environment,
      prettyPrint: options.prettyPrint ?? this.prettyPrint,
      redactSensitive: options.redactSensitive ?? this.redactSensitive,
      redactFields: options.redactFields ?? this.redactFields,
      redactMask: options.redactMask ?? this.redactMask,
      enableFileLogging: options.enableFileLogging ?? this.enableFileLogging,
      logRetentionDays: options.logRetentionDays ?? this.logRetentionDays,
      maxLogSizeMB: options.maxLogSizeMB ?? this.maxLogSizeMB,
      logDirectory: options.logDirectory ?? this.logDirectory,
    });
  }

  /**
   * Detect if JSON mode should be enabled based on environment
   */
  private detectJsonMode(): boolean {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'production' || nodeEnv === 'staging';
  }

  /**
   * Detect the current environment
   */
  private detectEnvironment(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  /**
   * Detect if pretty print should be enabled
   */
  private detectPrettyPrint(): boolean {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'development' || nodeEnv === 'test';
  }

  /**
   * Detect if file logging should be enabled
   * Auto-enabled in production if not explicitly disabled
   */
  private detectFileLogging(): boolean {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'production';
  }
}

/**
 * Default fields to redact
 */
const DEFAULT_REDACT_FIELDS: readonly string[] = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'credentials',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
  'jwt',
  'bearer',
  'cookie',
  'set-cookie',
];

/**
 * Parse a boolean environment variable
 */
function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.toLowerCase().trim();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return undefined;
}

/**
 * Parse an integer environment variable
 */
function parseIntEnv(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

/**
 * Global configuration instance
 * Initialized from environment variables
 */
let globalConfig: LoggerConfig | null = null;

/**
 * Get the global logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  if (!globalConfig) {
    globalConfig = LoggerConfig.fromEnv();
  }
  return globalConfig;
}

/**
 * Set the global logger configuration
 */
export function setLoggerConfig(config: LoggerConfig): void {
  globalConfig = config;
}

/**
 * Reset the global configuration (useful for testing)
 */
export function resetLoggerConfig(): void {
  globalConfig = null;
}
