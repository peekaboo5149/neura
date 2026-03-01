import { GraphState } from '@graph/core/types';
import { QueryProcessingWorkflow } from '@graph/workflows/query-processing.workflow';
import { Logger } from '@logging/Logger';
import { inject, injectable } from 'tsyringe';
import { QueryIntent, SecurityClassification } from './query-intent.enum';

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

  constructor(
    @inject('QueryProcessingWorkflow') private readonly workflow: QueryProcessingWorkflow
  ) {
    this.logger = new Logger('QueryService');
  }

  /**
   * Execute a query by processing it through the graph workflow.
   *
   * The workflow handles:
   * 1. Intent classification (via LLM)
   * 2. Security analysis
   * 3. Execution permission determination
   *
   * @param query - The natural language query from the user
   * @param context - Optional context for the query
   * @returns The classification result and execution status
   */
  public async execute(
    query: string,
    context?: Record<string, unknown>
  ): Promise<QueryExecutionResult> {
    this.logger.info('Query received', { query });

    // Create initial state for the graph
    const initialState: GraphState = {
      input: query,
      inputType: 'query',
      task: 'intent_classification',
      results: {},
      metadata: {
        startTime: new Date().toISOString(),
        nodeExecutionLog: [],
      },
      context: {
        ...context,
      },
    };

    try {
      // Execute the workflow
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const finalState = (await this.workflow.invoke(initialState)) as GraphState;

      this.logger.info('Query processed', {
        intent: finalState.results.intent?.intent,
        security: finalState.results.security?.classification,
        canExecute: finalState.results.security?.canExecute,
        nodesExecuted: finalState.metadata.nodeExecutionLog,
      });

      // Map final state to execution result
      return this.mapStateToResult(finalState);
    } catch (error) {
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Query processing failed', errorToLog);

      // Return safe fallback on failure
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Processing failed: ${errorToLog.message}`,
        classification: SecurityClassification.SAFE,
        canExecute: false,
      };
    }
  }

  /**
   * Map the final graph state to a QueryExecutionResult.
   *
   * @param state - The final graph state
   * @returns The mapped execution result
   */
  private mapStateToResult(state: GraphState): QueryExecutionResult {
    const intent = state.results.intent?.intent ?? QueryIntent.UNKNOWN;
    const reason = state.results.intent?.reason ?? 'No classification provided';
    const classification = state.results.security?.classification ?? SecurityClassification.SAFE;
    const canExecute = state.results.security?.canExecute ?? false;

    return {
      intent,
      reason,
      classification,
      canExecute,
    };
  }
}
