import { z } from 'zod';
import { BaseConfig } from './core/base.config';

/**
 * OpenAI configuration schema with validation
 */
const openaiConfigSchema = z.object({
  /** OpenAI API key - must be non-empty */
  apiKey: z.string().min(1, 'OpenAI API key cannot be empty'),
  /** OpenAI model to use */
  model: z.string().default('gpt-4'),
  /** Maximum tokens for completions */
  maxTokens: z.coerce.number().int().min(1).max(4096).default(2048),
  /** Temperature for response randomness (0-2) */
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  /** Request timeout in milliseconds */
  timeout: z.coerce.number().int().min(1000).default(30000),
});

/**
 * Type derived from schema
 */
export type OpenAIConfigType = z.infer<typeof openaiConfigSchema>;

/**
 * OpenAIConfig - OpenAI API configuration
 *
 * Encapsulates all OpenAI-related configuration with validation:
 * - API key (required, non-empty)
 * - Model selection
 * - Completion parameters
 * - Timeout settings
 */
export class OpenAIConfig extends BaseConfig<OpenAIConfigType> {
  protected getSchema(): import('zod').ZodSchema<OpenAIConfigType> {
    return openaiConfigSchema;
  }

  protected getEnvPrefix(): string {
    return 'OPENAI';
  }

  /**
   * Get the OpenAI API key
   */
  public get apiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Get the OpenAI model
   */
  public get model(): string {
    return this.config.model;
  }

  /**
   * Get the maximum tokens for completions
   */
  public get maxTokens(): number {
    return this.config.maxTokens;
  }

  /**
   * Get the temperature for response randomness
   */
  public get temperature(): number {
    return this.config.temperature;
  }

  /**
   * Get the request timeout in milliseconds
   */
  public get timeout(): number {
    return this.config.timeout;
  }
}
