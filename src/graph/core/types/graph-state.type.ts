/**
 * Generic Graph State Interface
 *
 * This is the core state interface used by all graphs in the system.
 * It's designed to be task-agnostic and extensible for any type of workflow.
 */

import { QueryIntent, SecurityClassification } from '@api/query/query-intent.enum';

/**
 * Results container - extensible record for any task results
 */
export interface GraphResults {
  /** Intent classification results */
  intent?: {
    intent: QueryIntent;
    reason: string;
  };

  /** Security analysis results */
  security?: {
    classification: SecurityClassification;
    canExecute: boolean;
  };

  /** Execution results */
  execution?: {
    output?: string;
    error?: string;
  };

  /** Extensible: any additional result types */
  [key: string]: unknown;
}

/**
 * Context passed through all nodes
 */
export interface GraphContext {
  /** User identifier */
  userId?: string;

  /** Session identifier */
  sessionId?: string;

  /** Request identifier for tracing */
  requestId?: string;

  /** Any additional context */
  [key: string]: unknown;
}

/**
 * Metadata for tracking execution
 */
export interface GraphMetadata {
  /** ISO timestamp when processing started */
  startTime: string;

  /** ISO timestamp when processing ended */
  endTime?: string;

  /** Log of nodes that were executed */
  nodeExecutionLog: string[];

  /** Error message if processing failed */
  error?: string;
}

/**
 * Generic Graph State
 *
 * This state is passed through all nodes in a graph.
 * Each node receives the full state and returns partial updates.
 */
export interface GraphState {
  /** Input to process (query, command, file path, etc.) */
  input: string;

  /** Type of input for routing decisions */
  inputType?: 'query' | 'command' | 'file_path' | 'code';

  /** Task identifier for multi-task graphs */
  task?: string;

  /** Processing results - populated by nodes */
  results: GraphResults;

  /** Execution metadata */
  metadata: GraphMetadata;

  /** Context passed through all nodes */
  context: GraphContext;
}

/**
 * Node function type
 * Takes current state, returns partial state updates
 */
export type GraphNode = (state: GraphState) => Promise<Partial<GraphState>> | Partial<GraphState>;

/**
 * Node factory function type
 * Creates a node with injected dependencies
 */
export type NodeFactory<TDependencies> = (deps: TDependencies) => GraphNode;

/**
 * Initial state factory
 * Creates a fresh initial state for graph execution
 */
export function createInitialState(input: string, context?: Partial<GraphContext>): GraphState {
  return {
    input,
    inputType: 'query',
    results: {},
    metadata: {
      startTime: new Date().toISOString(),
      nodeExecutionLog: [],
    },
    context: {
      ...context,
    },
  };
}
