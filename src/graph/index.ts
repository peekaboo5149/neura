/**
 * Graph Module
 *
 * Modular, extensible graph system for workflow orchestration.
 *
 * This module provides a generic graph infrastructure where:
 * - Core: Task-agnostic graph engine
 * - Nodes: Reusable, composable node implementations
 * - Workflows: Pre-configured compositions of nodes
 *
 * Example usage:
 * ```typescript
 * const workflow = createQueryProcessingWorkflow({ openAI: { apiKey, model, temperature } });
 * const finalState = await executeQueryProcessing(workflow, "Install puppeteer");
 * ```
 */

// Core exports
export * from './core';

// Node exports
export * from './nodes/intent-classification';

// Workflow exports
export * from './workflows';
