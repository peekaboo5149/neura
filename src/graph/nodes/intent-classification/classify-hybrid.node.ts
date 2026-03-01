/**
 * Hybrid Classify Intent Node
 *
 * Node that implements hybrid classification with uncertainty-based routing.
 * Implements Phase 3 from "Intent Detection in the Age of LLMs" research.
 *
 * Architecture:
 * 1. Lightweight classifier (fast similarity-based) as first stage
 * 2. Uncertainty estimation via Monte Carlo-style sampling
 * 3. LLM fallback for uncertain queries
 *
 * Benefits:
 * - ~50% latency reduction for confident predictions
 * - Maintains LLM accuracy for edge cases
 * - Configurable uncertainty threshold
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { ExampleStoreService } from '../../../services/example-store';
import { IntentDescriptionService } from '../../../services/intent-description';
import { LightweightClassifierService } from '../../../services/lightweight-classifier';
import { GraphNode, GraphState } from '../../core/types';
import { ClassificationResult, ClassifyIntentNodeDependencies } from './types';

export const HybridClassifyConfigToken = Symbol('HybridClassifyConfig');

export interface HybridClassifyDependencies extends ClassifyIntentNodeDependencies {
  lightweightClassifier: LightweightClassifierService;
  intentDescriptionService: IntentDescriptionService;
  exampleStoreService: ExampleStoreService;
  useAdaptiveICL?: boolean;
}

export interface HybridClassificationResult extends ClassificationResult {
  routing: {
    usedLightweight: boolean;
    usedLLM: boolean;
    uncertainty: {
      meanConfidence: number;
      variance: number;
      isUncertain: boolean;
    };
  };
}

@injectable()
export class HybridClassifyIntentNode {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private lightweightClassifier: LightweightClassifierService;
  private descriptionService: IntentDescriptionService;
  private exampleStore: ExampleStoreService;
  private useAdaptiveICL: boolean;
  private cachedSystemPrompt: string | null = null;

  constructor(
    @inject(HybridClassifyConfigToken)
    deps: HybridClassifyDependencies
  ) {
    this.client = new OpenAI({ apiKey: deps.apiKey });
    this.model = deps.model;
    this.temperature = deps.temperature;
    this.lightweightClassifier = deps.lightweightClassifier;
    this.descriptionService = deps.intentDescriptionService;
    this.exampleStore = deps.exampleStoreService;
    this.useAdaptiveICL = deps.useAdaptiveICL ?? true;
  }

  /**
   * Initialize the node (must be called before use)
   */
  async initialize(): Promise<void> {
    await this.lightweightClassifier.initializePrototypes();
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
          nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'classifyIntentHybrid'],
        },
      };
    };
  }

  /**
   * Hybrid classification with routing
   */
  private async classify(input: string): Promise<HybridClassificationResult> {
    const startTime = Date.now();

    try {
      // Stage 1: Lightweight classification with uncertainty
      const routing = await this.lightweightClassifier.classifyWithRouting(input);

      // Stage 2: Route based on uncertainty
      if (!routing.shouldUseLLM) {
        // Fast path: Use lightweight classifier result
        const duration = Date.now() - startTime;

        return {
          intent: routing.prediction.intent,
          reason: `Fast classification (confidence: ${(routing.prediction.confidence * 100).toFixed(1)}%, variance: ${routing.uncertainty.variance.toFixed(4)}, duration: ${duration}ms)`,
          success: true,
          routing: {
            usedLightweight: true,
            usedLLM: false,
            uncertainty: {
              meanConfidence: routing.uncertainty.meanConfidence,
              variance: routing.uncertainty.variance,
              isUncertain: routing.uncertainty.isUncertain,
            },
          },
        };
      }

      // Slow path: Use LLM for uncertain queries
      const llmResult = await this.classifyWithLLM(input);
      const duration = Date.now() - startTime;

      return {
        ...llmResult,
        reason: `${llmResult.reason} (LLM fallback due to uncertainty: variance=${routing.uncertainty.variance.toFixed(4)}, duration: ${duration}ms)`,
        routing: {
          usedLightweight: true,
          usedLLM: true,
          uncertainty: {
            meanConfidence: routing.uncertainty.meanConfidence,
            variance: routing.uncertainty.variance,
            isUncertain: routing.uncertainty.isUncertain,
          },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Classification failed: ${errorMessage}`,
        success: false,
        error: errorMessage,
        routing: {
          usedLightweight: false,
          usedLLM: false,
          uncertainty: {
            meanConfidence: 0,
            variance: 1,
            isUncertain: true,
          },
        },
      };
    }
  }

  /**
   * Classify using LLM (fallback for uncertain queries)
   */
  private async classifyWithLLM(input: string): Promise<ClassificationResult> {
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
  }

  /**
   * Get system prompt (with optional ICL)
   */
  private async getSystemPrompt(): Promise<string> {
    if (!this.cachedSystemPrompt) {
      this.cachedSystemPrompt = await this.descriptionService.buildEnhancedSystemPrompt();
    }

    if (!this.useAdaptiveICL) {
      return this.cachedSystemPrompt;
    }

    // Add ICL examples
    const iclExamples = await this.exampleStore.getICLExamples('placeholder', 3);

    if (iclExamples.length === 0) {
      return this.cachedSystemPrompt;
    }

    const iclSection = `=== SIMILAR EXAMPLES ===

${iclExamples
  .map(
    (ex, idx) => `${idx + 1}. Query: "${ex.query}"
   Intent: ${ex.intent}`
  )
  .join('\n\n')}`;

    return `${this.cachedSystemPrompt}\n\n${iclSection}`;
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
    this.cachedSystemPrompt = null;
    this.descriptionService.clearCache();
  }

  /**
   * Get classifier statistics
   */
  getStats(): {
    lightweight: ReturnType<LightweightClassifierService['getStats']>;
    exampleStore: ReturnType<ExampleStoreService['getStats']>;
  } {
    return {
      lightweight: this.lightweightClassifier.getStats(),
      exampleStore: this.exampleStore.getStats(),
    };
  }
}

/**
 * Factory function for creating hybrid classify node
 */
export async function createHybridClassifyIntentNode(
  deps: HybridClassifyDependencies
): Promise<GraphNode> {
  const node = new HybridClassifyIntentNode(deps);
  await node.initialize();
  return node.createNode();
}
