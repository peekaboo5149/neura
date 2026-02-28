/**
 * Config Core Module
 * 
 * Provides the foundation for the configuration system:
 * - BaseConfig: Abstract base class for all configs
 * - ConfigRegistry: Central registry for managing configs
 */

export { BaseConfig, type ConfigType } from './base.config';
export {
    CONFIG_TOKEN, ConfigRegistry, getConfigRegistry,
    registerConfigsInContainer,
    resolveConfig
} from './config.registry';

