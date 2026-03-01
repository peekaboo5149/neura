/**
 * LangGraph State Annotation
 *
 * Defines the Annotation.Root for the generic graph state.
 * This is used by LangGraph's StateGraph for type-safe state management.
 */

import { Annotation } from '@langchain/langgraph';
import { GraphContext, GraphMetadata, GraphResults } from './types/graph-state.type';

/**
 * State annotation for the generic graph.
 * Uses LangGraph's Annotation system for type-safe state management.
 */
export const GraphStateAnnotation = Annotation.Root({
  /** Input to process */
  input: Annotation<string>({
    value: (_prev, next) => next,
  }),

  /** Type of input */
  inputType: Annotation<string | undefined>({
    default: () => 'query',
    value: (_prev, next) => next,
  }),

  /** Task identifier */
  task: Annotation<string | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),

  /** Processing results */
  results: Annotation<GraphResults>({
    default: () => ({}),
    value: (_prev, next) => next,
  }),

  /** Execution metadata */
  metadata: Annotation<GraphMetadata>({
    default: () => ({
      startTime: new Date().toISOString(),
      nodeExecutionLog: [],
    }),
    value: (_prev, next) => next,
  }),

  /** Context passed through nodes */
  context: Annotation<GraphContext>({
    default: () => ({}),
    value: (_prev, next) => next,
  }),
});

/**
 * Type alias for the annotated state
 */
export type AnnotatedGraphState = typeof GraphStateAnnotation.State;
