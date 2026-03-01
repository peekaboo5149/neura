/**
 * Query Processing Workflow
 *
 * Pre-configured workflow for processing user queries.
 * Composes intent classification and security check nodes into a graph.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { GraphStateAnnotation } from '../core/state-annotation';
import {
  ClassifyIntentNodeDependencies,
  createClassifyIntentNode,
  createSecurityCheckNode,
} from '../nodes/intent-classification';

/**
 * Dependencies required by the query processing workflow
 */
export interface QueryProcessingWorkflowDependencies {
  /** OpenAI configuration for intent classification */
  openAI: ClassifyIntentNodeDependencies;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryProcessingWorkflow = any;

/**
 * Create the query processing workflow
 *
 * Builds a StateGraph that processes user queries through:
 * 1. Intent classification (LLM-based)
 * 2. Security check (permission analysis)
 *
 * @param deps - Workflow dependencies
 * @returns Compiled StateGraph ready for execution
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createQueryProcessingWorkflow(deps: QueryProcessingWorkflowDependencies) {
  // Create nodes with injected dependencies
  const classifyNode = createClassifyIntentNode(deps.openAI);
  const securityNode = createSecurityCheckNode();

  // Build the state graph
  const workflow = new StateGraph(GraphStateAnnotation)
    // Add nodes
    .addNode('classifyIntent', classifyNode)
    .addNode('securityCheck', securityNode)

    // Add edges
    .addEdge(START, 'classifyIntent')
    .addEdge('classifyIntent', 'securityCheck')
    .addEdge('securityCheck', END);

  // Compile and return
  return workflow.compile();
}
