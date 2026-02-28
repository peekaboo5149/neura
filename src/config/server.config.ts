import { z } from 'zod';
import { BaseConfig } from './core/base.config';

/**
 * Server configuration schema
 */
const serverConfigSchema = z.object({
  /** Server port */
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Server host */
  host: z.string().default('0.0.0.0'),
  /** Node environment */
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  /** Application name */
  appName: z.string().default('openclaw'),
  /** Application version */
  appVersion: z.string().default('1.0.0'),
  /** CORS origin */
  corsOrigin: z.union([z.string(), z.boolean()]).default(true),
  /** Enable request logging */
  enableRequestLogging: z.coerce.boolean().default(true),
});

/**
 * Type derived from schema
 */
export type ServerConfigType = z.infer<typeof serverConfigSchema>;

/**
 * ServerConfig - Server-related configuration
 *
 * Encapsulates all server configuration with validation:
 * - Port and host settings
 * - Environment configuration
 * - CORS settings
 * - Application metadata
 */
export class ServerConfig extends BaseConfig<ServerConfigType> {
  protected getSchema(): import('zod').ZodSchema<ServerConfigType> {
    return serverConfigSchema;
  }
  protected getEnvPrefix(): string {
    return '';
  }

  /**
   * Get the server port
   */
  public get port(): number {
    return this.config.port;
  }

  /**
   * Get the server host
   */
  public get host(): string {
    return this.config.host;
  }

  /**
   * Get the node environment
   */
  public get nodeEnv(): ServerConfigType['nodeEnv'] {
    return this.config.nodeEnv;
  }

  /**
   * Check if running in production
   */
  public get isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  public get isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  /**
   * Get application name
   */
  public get appName(): string {
    return this.config.appName;
  }

  /**
   * Get application version
   */
  public get appVersion(): string {
    return this.config.appVersion;
  }

  /**
   * Get CORS origin
   */
  public get corsOrigin(): string | boolean {
    return this.config.corsOrigin;
  }

  /**
   * Check if request logging is enabled
   */
  public get enableRequestLogging(): boolean {
    return this.config.enableRequestLogging;
  }
}
