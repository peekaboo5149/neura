import { ZodIssue, type ZodSchema } from 'zod';

/**
 * BaseConfig - Abstract base class for all configuration classes
 *
 * Provides common functionality for:
 * - Zod schema validation
 * - Environment variable loading
 * - Type-safe configuration access
 * - Fail-fast validation at startup
 */
export abstract class BaseConfig<TConfig> {
  /**
   * The parsed and validated configuration
   */
  public readonly config: TConfig;

  /**
   * Schema definition - must be implemented by subclasses
   */
  protected abstract getSchema(): ZodSchema<TConfig>;

  /**
   * Environment variable prefix for this config
   * Override in subclass if needed
   */
  protected getEnvPrefix(): string {
    return '';
  }

  constructor() {
    const rawConfig = this.loadFromEnv();
    this.config = this.validate(rawConfig);
  }

  /**
   * Load configuration from environment variables
   * Override in subclass for custom loading logic
   */
  protected loadFromEnv(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const prefix = this.getEnvPrefix() ? `${this.getEnvPrefix()}_` : '';

    // Get all environment variables that match the prefix
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;

      // Remove prefix and convert to camelCase
      const configKey = key.startsWith(prefix)
        ? this.toCamelCase(key.slice(prefix.length))
        : this.toCamelCase(key);

      // Try to parse as number or boolean
      config[configKey] = this.parseValue(value);
    }

    return config;
  }

  /**
   * Validate configuration against schema
   * Throws on validation failure (fail-fast)
   */
  protected validate(rawConfig: Record<string, unknown>): TConfig {
    const result = this.getSchema().safeParse(rawConfig);

    if (!result.success) {
      const errors = result.error.issues
        .map((issue: ZodIssue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(`Configuration validation failed for ${this.constructor.name}:\n${errors}`);
    }

    return result.data;
  }

  /**
   * Convert environment variable name to camelCase
   */
  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): unknown {
    // Try boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return

    // Try number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Return as string
    return value;
  }

  /**
   * Get a config value with type safety
   */
  public get<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.config[key];
  }
}

/**
 * Utility type to extract the config type from a BaseConfig class
 */
export type ConfigType<T> = T extends BaseConfig<infer C> ? C : never;
