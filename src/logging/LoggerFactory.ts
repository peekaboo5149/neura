import { getLoggerConfig, LoggerConfig } from './config/LoggerConfig';
import { CompositeLoggerEngine } from './engines/CompositeLoggerEngine';
import { ConsolePrettyEngine } from './engines/ConsolePrettyEngine';
import { FileRollingEngine } from './engines/FileRollingEngine';
import { JsonConsoleEngine } from './engines/JsonConsoleEngine';
import type { ILoggerEngine } from './interfaces/ILoggerEngine';
import { LogLevel } from './LogLevel';

/**
 * Engine type enumeration
 */
export enum EngineType {
  CONSOLE_PRETTY = 'console-pretty',
  JSON_CONSOLE = 'json-console',
  FILE_ROLLING = 'file-rolling',
  PINO = 'pino',
  WINSTON = 'winston',
  CUSTOM = 'custom',
}

/**
 * LoggerFactory - Factory for creating logger engines
 * Centralizes engine selection and configuration
 * Changing the logging backend only requires modifying this file
 */
export class LoggerFactory {
  private static customEngineFactory?: () => ILoggerEngine;
  // This is used in future extensibility - do not remove

  private static _engineType: EngineType = EngineType.CONSOLE_PRETTY;

  /**
   * Create a logger engine based on current configuration
   * This is the central method for engine selection
   */
  public static createEngine(): ILoggerEngine {
    const config = getLoggerConfig();

    // Determine engine type from environment or config
    const engineType = this.determineEngineType(config);

    // Check if file logging is enabled
    const isProduction = config.environment === 'production';
    const fileLoggingEnabled = config.enableFileLogging ?? isProduction;

    // Create console engine
    const consoleEngine = this.createConsoleEngine(config, engineType);

    // If file logging is not enabled, return console engine only
    if (!fileLoggingEnabled) {
      return consoleEngine;
    }

    // Create file rolling engine
    const fileEngine = new FileRollingEngine({
      level: config.level,
      includeTimestamp: config.timestamp,
      logDirectory: config.logDirectory,
      retentionDays: config.logRetentionDays,
      appName: config.appName,
      appVersion: config.appVersion,
      environment: config.environment,
    });

    // Initialize file engine (async, but we fire and forget for now)
    // In production, this should be awaited before logging
    void fileEngine.initialize();

    // Return composite engine that logs to both console and file
    return new CompositeLoggerEngine([consoleEngine, fileEngine], config.level);
  }

  /**
   * Create a console engine based on configuration
   */
  private static createConsoleEngine(config: LoggerConfig, engineType: EngineType): ILoggerEngine {
    switch (engineType) {
      case EngineType.CONSOLE_PRETTY:
        return new ConsolePrettyEngine(config.level, config.timestamp, process.stdout);

      case EngineType.JSON_CONSOLE:
        return new JsonConsoleEngine(
          config.level,
          config.timestamp,
          process.stdout,
          config.appName,
          config.appVersion,
          config.environment
        );

      case EngineType.CUSTOM:
        if (this.customEngineFactory) {
          return this.customEngineFactory();
        }
        console.warn('Custom engine factory not set, falling back to console-pretty');
        return new ConsolePrettyEngine(config.level, config.timestamp);

      case EngineType.PINO:
      case EngineType.WINSTON:
        console.warn(`${engineType} engine not yet implemented, falling back to json-console`);
        return new JsonConsoleEngine(
          config.level,
          config.timestamp,
          process.stdout,
          config.appName,
          config.appVersion,
          config.environment
        );

      default:
        return new ConsolePrettyEngine(config.level, config.timestamp);
    }
  }

  /**
   * Set the engine type to use
   */
  public static setEngineType(type: EngineType): void {
    this._engineType = type;
  }

  /**
   * Set a custom engine factory
   */
  public static setCustomEngineFactory(factory: () => ILoggerEngine): void {
    this.customEngineFactory = factory;
    this._engineType = EngineType.CUSTOM;
  }

  /**
   * Reset to default configuration
   */
  public static reset(): void {
    this._engineType = EngineType.CONSOLE_PRETTY;
    this.customEngineFactory = undefined;
  }

  /**
   * Determine which engine type to use based on configuration
   */
  private static determineEngineType(config: LoggerConfig): EngineType {
    // Check if engine type was explicitly set via setEngineType
    if (this._engineType !== EngineType.CONSOLE_PRETTY) {
      return this._engineType;
    }

    // Check for explicit engine type in environment
    const envEngine = process.env.LOG_ENGINE?.toLowerCase();

    if (envEngine) {
      switch (envEngine) {
        case 'console-pretty':
        case 'pretty':
          return EngineType.CONSOLE_PRETTY;
        case 'json':
        case 'json-console':
          return EngineType.JSON_CONSOLE;
        case 'pino':
          return EngineType.PINO;
        case 'winston':
          return EngineType.WINSTON;
        case 'custom':
          return EngineType.CUSTOM;
      }
    }

    // Auto-detect based on environment and config
    if (config.json) {
      return EngineType.JSON_CONSOLE;
    }

    if (config.prettyPrint) {
      return EngineType.CONSOLE_PRETTY;
    }

    // Default based on environment
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() ?? 'development';
    return nodeEnv === 'production' || nodeEnv === 'staging'
      ? EngineType.JSON_CONSOLE
      : EngineType.CONSOLE_PRETTY;
  }

  /**
   * Create an engine with explicit configuration
   * Useful for testing or special cases
   */
  public static createEngineWithConfig(config: {
    level?: LogLevel;
    json?: boolean;
    timestamp?: boolean;
    appName?: string;
    appVersion?: string;
    environment?: string;
  }): ILoggerEngine {
    const level = config.level ?? LogLevel.INFO;
    const timestamp = config.timestamp ?? true;

    if (config.json) {
      return new JsonConsoleEngine(
        level,
        timestamp,
        process.stdout,
        config.appName ?? 'app',
        config.appVersion,
        config.environment ?? 'production'
      );
    }

    return new ConsolePrettyEngine(level, timestamp, process.stdout);
  }
}

/**
 * Convenience function to create a logger engine
 */
export function createLoggerEngine(): ILoggerEngine {
  return LoggerFactory.createEngine();
}
