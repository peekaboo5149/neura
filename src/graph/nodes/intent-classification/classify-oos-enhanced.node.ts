/**
 * OOS-Enhanced Hybrid Classify Intent Node
 *
 * Node that combines hybrid classification with two-step OOS detection.
 * Implements Phase 5 from "Intent Detection in the Age of LLMs" research.
 *
 * Architecture:
 * 1. Lightweight classifier for fast path
 * 2. Two-step OOS detection for uncertain queries
 * 3. LLM fallback with OOS awareness
 *
 * Benefits:
 * - >5% improvement in OOS accuracy and F1-score
 * - Better handling of ambiguous queries
 * - No LLM fine-tuning required
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import {
  ExampleStoreService,
  IntentDescriptionService,
  LightweightClassifierService,
  OOSDetectionService,
} from '@services';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { GraphNode, GraphState } from '../../core/types';
import { ClassificationResult, ClassifyIntentNodeDependencies } from './types';

export const OOSEnhancedConfigToken = Symbol('OOSEnhancedConfig');

export interface OOSEnhancedDependencies extends ClassifyIntentNodeDependencies {
  lightweightClassifier: LightweightClassifierService;
  intentDescriptionService: IntentDescriptionService;
  exampleStoreService: ExampleStoreService;
  oosDetectionService: OOSDetectionService;
}

export interface OOSEnhancedResult extends ClassificationResult {
  routing: {
    usedLightweight: boolean;
    usedOOSDetection: boolean;
    usedLLM: boolean;
    oosAnalysis?: {
      isOOS: boolean;
      entropy: number;
      confidenceGap: number;
    };
  };
}

@injectable()
export class OOSEnhancedClassifyIntentNode {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private lightweightClassifier: LightweightClassifierService;
  private descriptionService: IntentDescriptionService;
  private oosDetectionService: OOSDetectionService;
  private cachedSystemPrompt: string | null = null;

  constructor(
    @inject(OOSEnhancedConfigToken)
    deps: OOSEnhancedDependencies
  ) {
    this.client = new OpenAI({ apiKey: deps.apiKey });
    this.model = deps.model;
    this.temperature = deps.temperature;
    this.lightweightClassifier = deps.lightweightClassifier;
    this.descriptionService = deps.intentDescriptionService;
    this.oosDetectionService = deps.oosDetectionService;
  }

  /**
   * Initialize the node
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
          nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'classifyIntentOOSEnhanced'],
        },
      };
    };
  }

  /**
   * OOS-enhanced hybrid classification
   */
  private async classify(input: string): Promise<OOSEnhancedResult> {
    const startTime = Date.now();

    try {
      // Stage 1: Lightweight classification
      const routing = await this.lightweightClassifier.classifyWithRouting(input);

      // If lightweight classifier is confident, use it
      if (!routing.shouldUseLLM) {
        const duration = Date.now() - startTime;
        return {
          intent: routing.prediction.intent,
          reason: `Fast classification (confidence: ${(routing.prediction.confidence * 100).toFixed(1)}%, ${duration}ms)`,
          success: true,
          routing: {
            usedLightweight: true,
            usedOOSDetection: false,
            usedLLM: false,
          },
        };
      }

      // Stage 2: Two-step OOS detection for uncertain queries
      const oosResult = await this.oosDetectionService.detectOOS(input);

      // If OOS detected, classify as UNKNOWN
      if (oosResult.isOOS) {
        const duration = Date.now() - startTime;
        return {
          intent: QueryIntent.UNKNOWN,
          reason: `OOS detected: ${oosResult.reasoning} (${duration}ms)`,
          success: true,
          routing: {
            usedLightweight: true,
            usedOOSDetection: true,
            usedLLM: false,
            oosAnalysis: {
              isOOS: oosResult.isOOS,
              entropy: oosResult.entropy,
              confidenceGap:
                oosResult.topConfidence - (Object.values(oosResult.scoreDistribution)[1] ?? 0),
            },
          },
        };
      }

      // Stage 3: LLM fallback for in-scope but uncertain queries
      const llmResult = await this.classifyWithLLM(input, oosResult.topIntent);
      const duration = Date.now() - startTime;

      return {
        ...llmResult,
        reason: `${llmResult.reason} (LLM fallback after OOS check: entropy=${oosResult.entropy.toFixed(2)}, ${duration}ms)`,
        routing: {
          usedLightweight: true,
          usedOOSDetection: true,
          usedLLM: true,
          oosAnalysis: {
            isOOS: oosResult.isOOS,
            entropy: oosResult.entropy,
            confidenceGap:
              oosResult.topConfidence - (Object.values(oosResult.scoreDistribution)[1] ?? 0),
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
          usedOOSDetection: false,
          usedLLM: false,
        },
      };
    }
  }

  /**
   * Classify using LLM with OOS awareness
   */
  private async classifyWithLLM(
    input: string,
    suggestedIntent: QueryIntent
  ): Promise<ClassificationResult> {
    const systemPrompt = await this.getSystemPrompt();

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Classify this query: "${input}"

Hint: The query appears to be related to "${suggestedIntent}" based on initial analysis.
If this query is outside Neura's scope (general knowledge, personal questions, etc.), classify as UNKNOWN.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return this.createUnknownResult('Empty response from API');
    }

    const parsed = JSON.parse(content) as { intent: string; reason: string };

    const intent = Object.values(QueryIntent).find((i) => i === (parsed.intent as QueryIntent));

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
   * Get system prompt
   */
  private async getSystemPrompt(): Promise<string> {
    if (!this.cachedSystemPrompt) {
      this.cachedSystemPrompt = await this.descriptionService.buildEnhancedSystemPrompt();
    }
    return this.cachedSystemPrompt;
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
}

/**
 * Factory function for creating OOS-enhanced classify node
 */
export async function createOOSEnhancedClassifyIntentNode(
  deps: OOSEnhancedDependencies
): Promise<GraphNode> {
  const node = new OOSEnhancedClassifyIntentNode(deps);
  await node.initialize();
  return node.createNode();
}
