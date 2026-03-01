/**
 * Enhanced Classify Intent Node
 *
 * Node that classifies user input using rich LLM-generated intent descriptions.
 * Implements Phase 1 from "Intent Detection in the Age of LLMs" research.
 *
 * Features:
 * - Rich semantic intent descriptions
 * - Caching for performance
 * - Enhanced system prompts with detailed context
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import { IntentDescriptionService } from '@services/intent-description';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { GraphNode, GraphState } from '../../core/types';
import { ClassificationResult, ClassifyIntentNodeDependencies } from './types';

export const EnhancedClassifyConfigToken = Symbol('EnhancedClassifyConfig');

export interface EnhancedClassifyDependencies extends ClassifyIntentNodeDependencies {
  intentDescriptionService: IntentDescriptionService;
  useEnhancedPrompt: boolean;
}

@injectable()
export class EnhancedClassifyIntentNode {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private descriptionService: IntentDescriptionService;
  private useEnhancedPrompt: boolean;
  private cachedSystemPrompt: string | null = null;

  constructor(
    @inject(EnhancedClassifyConfigToken)
    deps: EnhancedClassifyDependencies
  ) {
    this.client = new OpenAI({ apiKey: deps.apiKey });
    this.model = deps.model;
    this.temperature = deps.temperature;
    this.descriptionService = deps.intentDescriptionService;
    this.useEnhancedPrompt = deps.useEnhancedPrompt;
  }

  /**
   * Create the graph node function
   */
  createNode(): GraphNode {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
      const result = await this.classify(state.input);

      return {
        results: {
          ...state.results,
          intent: {
            intent: result.intent,
            reason: result.reason,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'classifyIntentEnhanced'],
        },
      };
    };
  }

  /**
   * Classify user input
   */
  private async classify(input: string): Promise<ClassificationResult> {
    try {
      const systemPrompt = await this.getSystemPrompt();

      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify this query: "${input}"` },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return this.createUnknownResult('Empty response from API');
      }

      const parsed = JSON.parse(content) as { intent: string; reason: string };

      // Validate the intent
      const intent = Object.values(QueryIntent).find((i) => i === (parsed.intent as QueryIntent));

      if (!intent) {
        return this.createUnknownResult(`Invalid intent returned: ${parsed.intent}`);
      }

      return {
        intent,
        reason: parsed.reason || 'No reason provided',
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Classification failed: ${errorMessage}`,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get system prompt (cached or enhanced)
   */
  private async getSystemPrompt(): Promise<string> {
    if (this.useEnhancedPrompt) {
      if (!this.cachedSystemPrompt) {
        this.cachedSystemPrompt = await this.descriptionService.buildEnhancedSystemPrompt();
      }
      return this.cachedSystemPrompt;
    }

    // Fallback to basic prompt
    return this.buildBasicSystemPrompt();
  }

  /**
   * Build basic system prompt (fallback)
   */
  private buildBasicSystemPrompt(): string {
    return `You are a strict security-focused intent classifier for Neura.

Respond with a JSON object containing:
- intent: The classified QueryIntent value
- reason: Comprehensive reasoning explaining the classification decision`;
  }

  /**
   * Create unknown result
   */
  private createUnknownResult(reason: string): ClassificationResult {
    return {
      intent: QueryIntent.UNKNOWN,
      reason,
      success: false,
      error: reason,
    };
  }

  /**
   * Clear cached system prompt
   */
  clearCache(): void {
    this.cachedSystemPrompt = null;
    this.descriptionService.clearCache();
  }
}

/**
 * Factory function for creating enhanced classify node
 */
export function createEnhancedClassifyIntentNode(deps: EnhancedClassifyDependencies): GraphNode {
  const node = new EnhancedClassifyIntentNode(deps);
  return node.createNode();
}
