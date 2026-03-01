/**
 * Intent Classification Node Types
 *
 * Type definitions specific to intent classification nodes.
 */

import { QueryIntent } from '@api/query/query-intent.enum';

/**
 * Dependencies required by the classify intent node
 */
export interface ClassifyIntentNodeDependencies {
  /** OpenAI API key */
  apiKey: string;

  /** Model name to use */
  model: string;

  /** Temperature for generation */
  temperature: number;
}

/**
 * Raw LLM response structure
 */
export interface RawClassificationResponse {
  intent: QueryIntent;
  reason: string;
}

/**
 * System prompt configuration
 */
export interface SystemPromptConfig {
  /** Base system prompt without format instructions */
  basePrompt: string;

  /** Format instructions for structured output */
  formatInstructions: string;
}

/**
 * Classification result with metadata
 */
export interface ClassificationResult {
  /** Classified intent */
  intent: QueryIntent;

  /** Reasoning for classification */
  reason: string;

  /** Whether classification succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}
