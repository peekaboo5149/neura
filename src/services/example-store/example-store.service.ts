/**
 * Example Store Service
 *
 * Implements Adaptive In-Context Learning (ICL) for intent classification.
 * Based on research: "Intent Detection in the Age of LLMs" (Arora et al., 2024)
 *
 * Features:
 * - Store and retrieve example queries with embeddings
 * - Find top-k similar examples per intent using similarity search
 * - Support for dynamic ICL example retrieval
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';

export interface ExampleEntry {
  id: string;
  query: string;
  intent: QueryIntent;
  embedding: number[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RetrievedExample {
  query: string;
  intent: QueryIntent;
  similarity: number;
}

export const ExampleStoreConfigToken = Symbol('ExampleStoreConfig');

export interface ExampleStoreConfig {
  apiKey: string;
  model?: string;
  similarityThreshold?: number;
  maxExamplesPerIntent?: number;
}

@injectable()
export class ExampleStoreService {
  private client: OpenAI;
  private model: string;
  private similarityThreshold: number;
  private maxExamplesPerIntent: number;

  // In-memory store (can be replaced with vector DB in production)
  private store: Map<string, ExampleEntry> = new Map();

  constructor(
    @inject(ExampleStoreConfigToken)
    config: ExampleStoreConfig
  ) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'text-embedding-3-small';
    this.similarityThreshold = config.similarityThreshold ?? 0.7;
    this.maxExamplesPerIntent = config.maxExamplesPerIntent ?? 3;
  }

  /**
   * Add an example to the store
   */
  async addExample(
    query: string,
    intent: QueryIntent,
    metadata?: Record<string, unknown>
  ): Promise<ExampleEntry> {
    const embedding = await this.generateEmbedding(query);
    const entry: ExampleEntry = {
      id: this.generateId(),
      query,
      intent,
      embedding,
      timestamp: new Date(),
      metadata,
    };

    this.store.set(entry.id, entry);
    return entry;
  }

  /**
   * Add multiple examples at once
   */
  async addExamples(
    examples: Array<{ query: string; intent: QueryIntent; metadata?: Record<string, unknown> }>
  ): Promise<ExampleEntry[]> {
    const entries: ExampleEntry[] = [];

    for (const example of examples) {
      const entry = await this.addExample(example.query, example.intent, example.metadata);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Find similar examples for a query
   * Returns top-k examples per intent above similarity threshold
   */
  async findSimilarExamples(
    query: string,
    options?: {
      targetIntent?: QueryIntent;
      topK?: number;
      threshold?: number;
    }
  ): Promise<RetrievedExample[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const threshold = options?.threshold ?? this.similarityThreshold;
    const topK = options?.topK ?? this.maxExamplesPerIntent;

    // Calculate similarities for all examples
    const similarities: Array<{ entry: ExampleEntry; similarity: number }> = [];

    for (const entry of this.store.values()) {
      // Filter by target intent if specified
      if (options?.targetIntent && entry.intent !== options.targetIntent) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (similarity >= threshold) {
        similarities.push({ entry, similarity });
      }
    }

    // Group by intent and take top-k per intent
    const groupedByIntent = new Map<QueryIntent, Array<{ entry: ExampleEntry; similarity: number }>>();

    for (const item of similarities) {
      const list = groupedByIntent.get(item.entry.intent) ?? [];
      list.push(item);
      groupedByIntent.set(item.entry.intent, list);
    }

    // Collect top-k per intent
    const results: RetrievedExample[] = [];

    for (const [, items] of groupedByIntent) {
      // Sort by similarity descending
      items.sort((a, b) => b.similarity - a.similarity);

      // Take top-k
      const topItems = items.slice(0, topK);

      for (const item of topItems) {
        results.push({
          query: item.entry.query,
          intent: item.entry.intent,
          similarity: item.similarity,
        });
      }
    }

    // Sort all results by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  }

  /**
   * Retrieve ICL examples for a query
   * Returns formatted examples for few-shot prompting
   */
  async getICLExamples(
    query: string,
    maxExamples: number = 5
  ): Promise<Array<{ query: string; intent: QueryIntent; explanation: string }>> {
    const similarExamples = await this.findSimilarExamples(query, {
      topK: 2, // Get top 2 per intent
    });

    // Take top N overall
    const topExamples = similarExamples.slice(0, maxExamples);

    return topExamples.map((ex) => ({
      query: ex.query,
      intent: ex.intent,
      explanation: `Similarity: ${(ex.similarity * 100).toFixed(1)}%`,
    }));
  }

  /**
   * Get examples by intent
   */
  getExamplesByIntent(intent: QueryIntent): ExampleEntry[] {
    const examples: ExampleEntry[] = [];

    for (const entry of this.store.values()) {
      if (entry.intent === intent) {
        examples.push(entry);
      }
    }

    return examples.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalExamples: number;
    examplesPerIntent: Record<QueryIntent, number>;
  } {
    const examplesPerIntent: Record<string, number> = {};

    for (const intent of Object.values(QueryIntent)) {
      examplesPerIntent[intent] = 0;
    }

    for (const entry of this.store.values()) {
      examplesPerIntent[entry.intent] = (examplesPerIntent[entry.intent] ?? 0) + 1;
    }

    return {
      totalExamples: this.store.size,
      examplesPerIntent: examplesPerIntent as Record<QueryIntent, number>,
    };
  }

  /**
   * Clear all examples
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove example by ID
   */
  removeExample(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Generate embedding for text using OpenAI API
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
      // Return empty embedding on failure
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
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
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
