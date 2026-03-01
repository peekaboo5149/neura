/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import 'reflect-metadata';

/**
 * Query Service Tests
 *
 * Tests for the QueryService with mocked workflow.
 */

import { GraphState } from '@graph/core/types';
import { QueryIntent, SecurityClassification } from './query-intent.enum';
import { QueryService } from './query.service';

describe('QueryService', () => {
  const createMockWorkflow = (implementation?: (state: GraphState) => Promise<GraphState>) => ({
    invoke: jest.fn().mockImplementation(async (state: GraphState) => {
      if (implementation) {
        return implementation(state);
      }
      return {
        ...state,
        results: {
          intent: {
            intent: QueryIntent.FILE_READ,
            reason: 'Test classification',
          },
          security: {
            classification: SecurityClassification.SAFE,
            canExecute: true,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['classifyIntent', 'securityCheck'],
        },
      };
    }),
  });

  const createService = (workflow = createMockWorkflow()) => {
    return new QueryService(workflow);
  };

  describe('execute', () => {
    it('should return successful execution result', async () => {
      const service = createService();
      const result = await service.execute('Read package.json');

      expect(result.intent).toBe(QueryIntent.FILE_READ);
      expect(result.reason).toBe('Test classification');
      expect(result.classification).toBe(SecurityClassification.SAFE);
      expect(result.canExecute).toBe(true);
    });

    it('should handle RESTRICTED intent', async () => {
      const restrictedWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {
          intent: {
            intent: QueryIntent.PERMISSION_MODIFICATION,
            reason: 'Permission modification detected',
          },
          security: {
            classification: SecurityClassification.RESTRICTED,
            canExecute: false,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['classifyIntent', 'securityCheck'],
        },
      }));

      const service = createService(restrictedWorkflow);
      const result = await service.execute('chmod 777 everything');

      expect(result.intent).toBe(QueryIntent.PERMISSION_MODIFICATION);
      expect(result.classification).toBe(SecurityClassification.RESTRICTED);
      expect(result.canExecute).toBe(false);
    });

    it('should handle SENSITIVE intent', async () => {
      const sensitiveWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {
          intent: {
            intent: QueryIntent.PACKAGE_MANAGEMENT,
            reason: 'Package installation',
          },
          security: {
            classification: SecurityClassification.SENSITIVE,
            canExecute: true,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['classifyIntent', 'securityCheck'],
        },
      }));

      const service = createService(sensitiveWorkflow);
      const result = await service.execute('Install lodash');

      expect(result.intent).toBe(QueryIntent.PACKAGE_MANAGEMENT);
      expect(result.classification).toBe(SecurityClassification.SENSITIVE);
      expect(result.canExecute).toBe(true);
    });

    it('should handle UNKNOWN intent', async () => {
      const unknownWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {
          intent: {
            intent: QueryIntent.UNKNOWN,
            reason: 'Could not classify',
          },
          security: {
            classification: SecurityClassification.SAFE,
            canExecute: false,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['classifyIntent', 'securityCheck'],
        },
      }));

      const service = createService(unknownWorkflow);
      const result = await service.execute('Something random');

      expect(result.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.canExecute).toBe(false);
    });

    it('should pass context to workflow', async () => {
      const workflow = createMockWorkflow();
      const service = createService(workflow);
      const context = { userId: 'user123', sessionId: 'session456' };

      await service.execute('Read file', context);

      expect(workflow.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining(context),
        })
      );
    });

    it('should create correct initial state', async () => {
      const workflow = createMockWorkflow();
      const service = createService(workflow);

      await service.execute('Read package.json');

      expect(workflow.invoke).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'Read package.json',
          inputType: 'query',
          task: 'intent_classification',
          results: {},
          metadata: expect.objectContaining({
            startTime: expect.any(String),
            nodeExecutionLog: [],
          }),
          context: {},
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle workflow throwing error', async () => {
      const errorWorkflow = {
        invoke: jest.fn().mockRejectedValue(new Error('Workflow failed')),
      };
      const service = createService(errorWorkflow);

      const result = await service.execute('Some query');

      expect(result.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.reason).toContain('Workflow failed');
      expect(result.classification).toBe(SecurityClassification.SAFE);
      expect(result.canExecute).toBe(false);
    });

    it('should handle non-Error throw', async () => {
      const errorWorkflow = {
        invoke: jest.fn().mockRejectedValue('String error'),
      };
      const service = createService(errorWorkflow);

      const result = await service.execute('Some query');

      expect(result.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.reason).toContain('String error');
    });
  });

  describe('result mapping', () => {
    it('should use defaults when results are missing', async () => {
      const emptyWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {},
        metadata: {
          ...state.metadata,
          nodeExecutionLog: [],
        },
      }));

      const service = createService(emptyWorkflow);
      const result = await service.execute('Some query');

      expect(result.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.reason).toBe('No classification provided');
      expect(result.classification).toBe(SecurityClassification.SAFE);
      expect(result.canExecute).toBe(false);
    });

    it('should handle missing security result', async () => {
      const partialWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {
          intent: {
            intent: QueryIntent.FILE_READ,
            reason: 'File operation',
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['classifyIntent'],
        },
      }));

      const service = createService(partialWorkflow);
      const result = await service.execute('Read file');

      expect(result.intent).toBe(QueryIntent.FILE_READ);
      expect(result.classification).toBe(SecurityClassification.SAFE);
      expect(result.canExecute).toBe(false);
    });

    it('should handle missing intent result', async () => {
      const partialWorkflow = createMockWorkflow(async (state: GraphState) => ({
        ...state,
        results: {
          security: {
            classification: SecurityClassification.RESTRICTED,
            canExecute: false,
          },
        },
        metadata: {
          ...state.metadata,
          nodeExecutionLog: ['securityCheck'],
        },
      }));

      const service = createService(partialWorkflow);
      const result = await service.execute('Dangerous command');

      expect(result.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.classification).toBe(SecurityClassification.RESTRICTED);
      expect(result.canExecute).toBe(false);
    });
  });
});
