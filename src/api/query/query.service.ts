import { OpenAIConfig } from '@config/openai.config';
import { Logger } from '@logging/Logger';
import { inject, injectable } from 'tsyringe';
import { IntentClassificationChain } from './chains/intent-classification.chain';
import { QueryIntent, QueryIntentMetadata, SecurityClassification } from './query-intent.enum';

/**
 * Result of query execution and classification.
 */
export interface QueryExecutionResult {
  /** The classified intent */
  intent: QueryIntent;

  /** Reasoning for the classification */
  reason: string;

  /** Security classification */
  classification: SecurityClassification;

  /** Whether the operation can be executed */
  canExecute: boolean;
}

@injectable()
export class QueryService {
  private readonly logger: Logger;
  private readonly classificationChain: IntentClassificationChain;

  constructor(@inject(OpenAIConfig) private readonly openAIConfig: OpenAIConfig) {
    this.logger = new Logger('QueryService');
    this.classificationChain = IntentClassificationChain.create(
      this.openAIConfig.apiKey,
      this.openAIConfig.model,
      0.1 // Low temperature for consistent classification
    );
  }

  /**
   * Execute a query by first classifying intent, then handling appropriately.
   *
   * @param query - The natural language query from the user
   * @param _context - Optional context for the query
   * @returns The classification result and execution status
   */
  public async execute(
    query: string,
    _context?: Record<string, unknown>
  ): Promise<QueryExecutionResult> {
    this.logger.info('Query received', { query, model: this.openAIConfig.model });

    // Step 1: Classify the query intent using LangChain
    const classification = await this.classifyQuery(query);
    this.logger.info('Query classified', {
      intent: classification.intent,
      classification: QueryIntentMetadata[classification.intent].classification,
    });

    // Step 2: Check if operation is allowed
    const metadata = QueryIntentMetadata[classification.intent];

    if (metadata.classification === SecurityClassification.RESTRICTED) {
      this.logger.warn('Restricted operation attempted', { intent: classification.intent });
      return {
        intent: classification.intent,
        reason: classification.reason,
        classification: metadata.classification,
        canExecute: false,
      };
    }

    // Step 3: Return classification with execution status
    return {
      intent: classification.intent,
      reason: classification.reason,
      classification: metadata.classification,
      canExecute: true,
    };
  }

  /**
   * Classify a query into a QueryIntent using LangChain.
   *
   * @param query - The user's natural language query
   * @returns The classification response with intent and reasoning
   */
  private async classifyQuery(query: string): Promise<{
    intent: QueryIntent;
    reason: string;
  }> {
    try {
      const result = await this.classificationChain.classify(query);
      return result;
    } catch (error) {
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Query classification failed', errorToLog);

      // Return UNKNOWN on classification failure
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Classification failed: ${errorToLog.message}`,
      };
    }
  }
}
