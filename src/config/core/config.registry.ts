import { container, type InjectionToken } from 'tsyringe';
import { BaseConfig } from './base.config';

/**
 * Configuration token for DI registration
 */
export const CONFIG_TOKEN = Symbol('Config');

/**
 * ConfigRegistry - Central registry for all application configurations
 * 
 * Implements the Registry pattern for managing configuration instances.
 * All configs are validated at registration time (fail-fast).
 */
export class ConfigRegistry {
  private static instance: ConfigRegistry;
  private readonly configs = new Map<string, BaseConfig<unknown>>();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }

  /**
   * Register a configuration class
   * The config is instantiated and validated immediately
   */
  public register<TConfig>(
    name: string,
    ConfigClass: new () => BaseConfig<TConfig>
  ): BaseConfig<TConfig> {
    const config = new ConfigClass();
    this.configs.set(name, config as BaseConfig<unknown>);
    return config;
  }

  /**
   * Get a registered configuration
   */
  public get<TConfig>(name: string): BaseConfig<TConfig> | undefined {
    return this.configs.get(name) as BaseConfig<TConfig> | undefined;
  }

  /**
   * Get all registered configurations
   */
  public getAll(): Map<string, BaseConfig<unknown>> {
    return new Map(this.configs);
  }

  /**
   * Check if a configuration is registered
   */
  public has(name: string): boolean {
    return this.configs.has(name);
  }

  /**
   * Clear all configurations (useful for testing)
   */
  public clear(): void {
    this.configs.clear();
  }
}

/**
 * Convenience function to get config registry
 */
export function getConfigRegistry(): ConfigRegistry {
  return ConfigRegistry.getInstance();
}

/**
 * Register all configs into the DI container
 * Call this during bootstrap before starting the server
 */
export function registerConfigsInContainer(): void {
  const registry = ConfigRegistry.getInstance();

  // Register each config in the DI container
  for (const [name, config] of registry.getAll()) {
    const token = Symbol.for(`Config:${name}`);
    container.register(token, { useValue: config });
  }
}

/**
 * Resolve a config from the DI container
 */
export function resolveConfig<T>(name: string): T {
  const token = Symbol.for(`Config:${name}`);
  return container.resolve<T>(token as InjectionToken<T>);
}
