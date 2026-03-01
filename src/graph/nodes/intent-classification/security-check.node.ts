/**
 * Security Check Node
 *
 * Node that performs security analysis on the classified intent.
 * Determines if the operation can be executed based on security classification.
 */

import {
  QueryIntent,
  QueryIntentMetadata,
  SecurityClassification,
} from '@api/query/query-intent.enum';
import { GraphNode, GraphState } from '../../core/types';

/**
 * Check if query is clearly out of scope based on patterns
 */
function isOutOfScope(input: string): boolean {
  const patterns = [
    /^who\s/i,
    /^what\s/i,
    /^where\s/i,
    /^when\s/i,
    /^tell\sme/i,
    /^explain/i,
    /^joke/i,
    /^buy\sme/i,
  ];

  return patterns.some((p) => p.test(input.trim()));
}

/**
 * Create the security check node
 *
 * Analyzes the classified intent and determines execution permissions.
 */
export function createSecurityCheckNode(): GraphNode {
  return (state: GraphState): Partial<GraphState> => {
    const intent = state.results.intent?.intent ?? QueryIntent.UNKNOWN;
    const metadata = QueryIntentMetadata[intent];
    const classification = metadata.classification;

    // Check if input is out of scope
    if (isOutOfScope(state.input)) {
      return {
        results: {
          ...state.results,
          security: {
            classification: SecurityClassification.SAFE,
            canExecute: false,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'securityCheck'],
        },
      };
    }

    // Determine if operation can execute based on classification
    const canExecute = classification !== SecurityClassification.RESTRICTED;

    return {
      results: {
        ...state.results,
        security: {
          classification,
          canExecute,
        },
      },
      metadata: {
        ...state.metadata,
        nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'securityCheck'],
      },
    };
  };
}
