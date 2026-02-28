/**
 * Config Module
 *
 * Centralized configuration management with:
 * - Zod-based schema validation
 * - Type-safe configuration access
 * - DI integration
 * - Fail-fast validation
 */

// Core exports
export {
  BaseConfig,
  CONFIG_TOKEN,
  ConfigRegistry,
  getConfigRegistry,
  registerConfigsInContainer,
  resolveConfig,
  type ConfigType,
} from './core';

// Config classes
export { LoggingConfig, type LoggingConfigType } from './logging.config';
export { OpenAIConfig, type OpenAIConfigType } from './openai.config';
export { ServerConfig, type ServerConfigType } from './server.config';

/**
 * Initialize all configurations
 * Call this during bootstrap before starting the server
 */
import { getConfigRegistry, registerConfigsInContainer } from './core';
import { LoggingConfig } from './logging.config';
import { OpenAIConfig } from './openai.config';
import { ServerConfig } from './server.config';

export function initializeConfigs(): void {
  const registry = getConfigRegistry();

  // Register all configs
  registry.register('server', ServerConfig);
  registry.register('logging', LoggingConfig);
  registry.register('openai', OpenAIConfig);

  // Register in DI container
  registerConfigsInContainer();
}
