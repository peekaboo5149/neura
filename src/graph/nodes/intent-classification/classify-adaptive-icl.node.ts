/**
 * Adaptive ICL Classify Intent Node
 *
 * Node that classifies user input using Adaptive In-Context Learning.
 * Implements Phase 2 from "Intent Detection in the Age of LLMs" research.
 *
 * Features:
 * - Dynamic retrieval of similar examples for few-shot prompting
 * - Combines example-based ICL with rich intent descriptions
 * - Similarity-based example selection per intent
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import { ExampleStoreService, IntentDescriptionService } from '@services';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { GraphNode, GraphState } from '../../core/types';
import { ClassificationResult, ClassifyIntentNodeDependencies } from './types';

export const AdaptiveICLConfigToken = Symbol('AdaptiveICLConfig');

export interface AdaptiveICLDependencies extends ClassifyIntentNodeDependencies {
  intentDescriptionService: IntentDescriptionService;
  exampleStoreService: ExampleStoreService;
  maxICLExamples?: number;
  similarityThreshold?: number;
}

@injectable()
export class AdaptiveICLClassifyIntentNode {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private descriptionService: IntentDescriptionService;
  private exampleStore: ExampleStoreService;
  private maxICLExamples: number;

  private cachedIntentDescriptions: string | null = null;

  constructor(
    @inject(AdaptiveICLConfigToken)
    deps: AdaptiveICLDependencies
  ) {
    this.client = new OpenAI({ apiKey: deps.apiKey });
    this.model = deps.model;
    this.temperature = deps.temperature;
    this.descriptionService = deps.intentDescriptionService;
    this.exampleStore = deps.exampleStoreService;
    this.maxICLExamples = deps.maxICLExamples ?? 5;

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
          nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'classifyIntentAdaptiveICL'],
        },
      };
    };
  }

  /**
   * Classify user input with adaptive ICL
   */
  private async classify(input: string): Promise<ClassificationResult> {
    try {
      // Get ICL examples dynamically
      const iclExamples = await this.exampleStore.getICLExamples(
        input,
        this.maxICLExamples
      );

      // Build adaptive system prompt
      const systemPrompt = await this.buildAdaptiveSystemPrompt(input, iclExamples);

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
      const intent = Object.values(QueryIntent).find((i) => i === parsed.intent) as
        | QueryIntent
        | undefined;

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
   * Build adaptive system prompt with ICL examples
   */
  private async buildAdaptiveSystemPrompt(
    _query: string,
    iclExamples: Array<{ query: string; intent: QueryIntent; explanation: string }>
  ): Promise<string> {
    // Get intent descriptions (cached)
    if (!this.cachedIntentDescriptions) {
      this.cachedIntentDescriptions = await this.descriptionService.buildEnhancedSystemPrompt();
    }

    // Build ICL section
    const iclSection =
      iclExamples.length > 0
        ? `=== SIMILAR EXAMPLES (In-Context Learning) ===

The following examples are similar to the query you need to classify:

${iclExamples
  .map(
    (ex, idx) => `${idx + 1}. Query: "${ex.query}"
   Intent: ${ex.intent}
   Reasoning: ${ex.explanation}`
  )
  .join('\n\n')}

Use these examples to understand the classification patterns.`
        : '';

    return `${this.cachedIntentDescriptions}

${iclSection}

=== ADAPTIVE CLASSIFICATION INSTRUCTIONS ===

1. Review the similar examples above to understand classification patterns
2. Compare the query to classify with the examples
3. Consider the intent descriptions and their scope boundaries
4. Choose the SINGLE most appropriate intent
5. When uncertain, choose the MORE RESTRICTIVE intent
6. Provide detailed reasoning referencing the examples when relevant

=== RESPONSE FORMAT ===

Respond with a JSON object:
{
  "intent": "The classified QueryIntent value",
  "reason": "Detailed reasoning: 1) Pattern matching with examples, 2) Intent description alignment, 3) Security considerations"
}`;
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
   * Clear caches
   */
  clearCache(): void {
    this.cachedIntentDescriptions = null;
    this.descriptionService.clearCache();
  }

  /**
   * Get ICL statistics
   */
  getICLStats(): {
    totalExamples: number;
    examplesPerIntent: Record<QueryIntent, number>;
  } {
    return this.exampleStore.getStats();
  }
}

/**
 * Factory function for creating adaptive ICL classify node
 */
export function createAdaptiveICLClassifyIntentNode(deps: AdaptiveICLDependencies): GraphNode {
  const node = new AdaptiveICLClassifyIntentNode(deps);
  return node.createNode();
}
