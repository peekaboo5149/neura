/**
 * Lightweight Classifier Service
 *
 * Implements a fast similarity-based classifier for intent detection.
 * Based on research: "Intent Detection in the Age of LLMs" (Arora et al., 2024)
 *
 * This service acts as the first stage in a hybrid classification system:
 * 1. Fast similarity-based classification using embeddings
 * 2. Uncertainty estimation via prediction variance
 * 3. Routing to LLM when uncertain
 *
 * Features:
 * - Embedding-based similarity classification
 * - Monte Carlo Dropout-style uncertainty estimation
 * - Configurable confidence thresholds
 */

import { QueryIntent, QueryIntentMetadata } from '@api/query/query-intent.enum';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { AugmentedExample, DataAugmentationService } from '../data-augmentation';

export interface ClassificationPrediction {
  intent: QueryIntent;
  confidence: number;
  allScores: Record<QueryIntent, number>;
}

export interface UncertaintyEstimate {
  meanConfidence: number;
  variance: number;
  stdDev: number;
  isUncertain: boolean;
  samples: number;
}

export const LightweightClassifierConfigToken = Symbol('LightweightClassifierConfig');

export interface LightweightClassifierConfig {
  apiKey: string;
  model?: string;
  uncertaintyThreshold?: number;
  numMonteCarloSamples?: number;
  similarityThreshold?: number;
}

interface IntentPrototype {
  intent: QueryIntent;
  embeddings: number[][];
  examples: string[];
}

@injectable()
export class LightweightClassifierService {
  private client: OpenAI;
  private model: string;
  private uncertaintyThreshold: number;
  private numMonteCarloSamples: number;
  private similarityThreshold: number;

  // Intent prototypes with example embeddings
  private prototypes: Map<QueryIntent, IntentPrototype> = new Map();

  constructor(
    @inject(LightweightClassifierConfigToken)
    config: LightweightClassifierConfig
  ) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
    this.uncertaintyThreshold = config.uncertaintyThreshold ?? 0.1;
    this.numMonteCarloSamples = config.numMonteCarloSamples ?? 5;
    this.similarityThreshold = config.similarityThreshold ?? 0.7;
  }

  /**
   * Initialize prototypes from QueryIntentMetadata examples
   * Optionally includes augmented negative examples for better OOS detection
   */
  async initializePrototypes(
    useAugmentation: boolean = false,
    augmentationService?: DataAugmentationService
  ): Promise<void> {
    // Collect all examples for augmentation
    const allExamples: Array<{ query: string; intent: QueryIntent }> = [];

    for (const [intent, metadata] of Object.entries(QueryIntentMetadata)) {
      const queryIntent = intent as QueryIntent;
      for (const example of metadata.examples) {
        allExamples.push({ query: example, intent: queryIntent });
      }
    }

    // Generate augmented examples if requested
    let augmentedExamples: AugmentedExample[] = [];
    if (useAugmentation && augmentationService) {
      augmentedExamples = augmentationService.augmentExamples(allExamples);

      // Add generated negative examples
      const negativeExamples = augmentationService.generateNegativeExamples(20);
      augmentedExamples = [...augmentedExamples, ...negativeExamples];
    }

    // Build prototypes with original + augmented examples
    for (const [intent, metadata] of Object.entries(QueryIntentMetadata)) {
      const queryIntent = intent as QueryIntent;
      const examples = [...metadata.examples];

      // Add augmented examples for this intent
      if (useAugmentation) {
        const intentAugmented = augmentedExamples.filter(
          (aug) => aug.metadata?.intent === queryIntent && !aug.shouldBeOOS
        );
        examples.push(...intentAugmented.map((aug) => aug.augmentedQuery));
      }

      if (examples.length === 0) continue;

      // Generate embeddings for all examples
      const embeddings: number[][] = [];
      for (const example of examples) {
        const embedding = await this.generateEmbedding(example);
        if (embedding.length > 0) {
          embeddings.push(embedding);
        }
      }

      this.prototypes.set(queryIntent, {
        intent: queryIntent,
        embeddings,
        examples,
      });
    }

    // Store negative examples for OOS detection
    if (useAugmentation) {
      const negativeQueries = augmentedExamples
        .filter((aug) => aug.shouldBeOOS)
        .map((aug) => aug.augmentedQuery);

      if (negativeQueries.length > 0) {
        const negativeEmbeddings: number[][] = [];
        for (const query of negativeQueries) {
          const embedding = await this.generateEmbedding(query);
          if (embedding.length > 0) {
            negativeEmbeddings.push(embedding);
          }
        }

        this.prototypes.set(QueryIntent.UNKNOWN, {
          intent: QueryIntent.UNKNOWN,
          embeddings: negativeEmbeddings,
          examples: negativeQueries,
        });
      }
    }
  }

  /**
   * Classify a query using similarity to prototypes
   */
  async classify(query: string): Promise<ClassificationPrediction> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (queryEmbedding.length === 0) {
      return {
        intent: QueryIntent.UNKNOWN,
        confidence: 0,
        allScores: this.getZeroScores(),
      };
    }

    // Calculate similarity scores for each intent
    const scores: Record<string, number> = {};

    for (const [intent, prototype] of this.prototypes) {
      const similarities = prototype.embeddings.map((emb) =>
        this.cosineSimilarity(queryEmbedding, emb)
      );
      // Use max similarity as the score
      scores[intent] = Math.max(...similarities, 0);
    }

    // Find best matching intent
    let bestIntent = QueryIntent.UNKNOWN;
    let bestScore = -1;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as QueryIntent;
      }
    }

    // If best score is below threshold, classify as UNKNOWN
    if (bestScore < this.similarityThreshold) {
      bestIntent = QueryIntent.UNKNOWN;
      bestScore = 0;
    }

    return {
      intent: bestIntent,
      confidence: bestScore,
      allScores: scores as Record<QueryIntent, number>,
    };
  }

  /**
   * Estimate uncertainty using Monte Carlo-style sampling
   * In practice, we simulate uncertainty by:
   * 1. Using different subsets of prototype examples
   * 2. Adding small noise to embeddings
   */
  async estimateUncertainty(query: string): Promise<UncertaintyEstimate> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (queryEmbedding.length === 0) {
      return {
        meanConfidence: 0,
        variance: 1,
        stdDev: 1,
        isUncertain: true,
        samples: 0,
      };
    }

    const predictions: number[] = [];

    // Simulate MC dropout by sampling with noise
    for (let i = 0; i < this.numMonteCarloSamples; i++) {
      const noisyEmbedding = this.addNoise(queryEmbedding, 0.01 * (i + 1));
      const prediction = this.classifyWithEmbedding(noisyEmbedding);
      predictions.push(prediction.confidence);
    }

    // Calculate statistics
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance =
      predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length;
    const stdDev = Math.sqrt(variance);

    return {
      meanConfidence: mean,
      variance,
      stdDev,
      isUncertain: variance > this.uncertaintyThreshold || mean < this.similarityThreshold,
      samples: predictions.length,
    };
  }

  /**
   * Hybrid classification: Fast path + LLM fallback
   */
  async classifyWithRouting(query: string): Promise<{
    prediction: ClassificationPrediction;
    uncertainty: UncertaintyEstimate;
    shouldUseLLM: boolean;
  }> {
    const prediction = await this.classify(query);
    const uncertainty = await this.estimateUncertainty(query);

    // Route to LLM if uncertain
    const shouldUseLLM = uncertainty.isUncertain;

    return {
      prediction,
      uncertainty,
      shouldUseLLM,
    };
  }

  /**
   * Get classification statistics
   */
  getStats(): {
    numPrototypes: number;
    prototypesInfo: Array<{ intent: QueryIntent; numExamples: number }>;
  } {
    const prototypesInfo: Array<{ intent: QueryIntent; numExamples: number }> = [];

    for (const [intent, prototype] of this.prototypes) {
      prototypesInfo.push({
        intent,
        numExamples: prototype.examples.length,
      });
    }

    return {
      numPrototypes: this.prototypes.size,
      prototypesInfo,
    };
  }

  /**
   * Clear all prototypes
   */
  clearPrototypes(): void {
    this.prototypes.clear();
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0]?.embedding ?? [];
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return [];
    }
  }

  /**
   * Classify using a pre-computed embedding
   */
  private classifyWithEmbedding(embedding: number[]): ClassificationPrediction {
    const scores: Record<string, number> = {};

    for (const [intent, prototype] of this.prototypes) {
      const similarities = prototype.embeddings.map((emb) => this.cosineSimilarity(embedding, emb));
      scores[intent] = Math.max(...similarities, 0);
    }

    let bestIntent = QueryIntent.UNKNOWN;
    let bestScore = -1;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as QueryIntent;
      }
    }

    if (bestScore < this.similarityThreshold) {
      bestIntent = QueryIntent.UNKNOWN;
      bestScore = 0;
    }

    return {
      intent: bestIntent,
      confidence: bestScore,
      allScores: scores as Record<QueryIntent, number>,
    };
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Add Gaussian noise to embedding (simulates MC dropout)
   */
  private addNoise(embedding: number[], stdDev: number): number[] {
    return embedding.map((val) => val + this.gaussianRandom(0, stdDev));
  }

  /**
   * Generate Gaussian random number
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Get zero scores for all intents
   */
  private getZeroScores(): Record<QueryIntent, number> {
    const scores: Record<string, number> = {};
    for (const intent of Object.values(QueryIntent)) {
      scores[intent] = 0;
    }
    return scores as Record<QueryIntent, number>;
  }
}
